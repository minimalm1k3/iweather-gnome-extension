import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

/*
 * Rounded blur integration and interactive repaint scheduling follow the
 * Blur My Shell approach:
 * https://github.com/aunetx/blur-my-shell/blob/master/src/effects/native_dynamic_gaussian_blur.js
 * https://github.com/aunetx/blur-my-shell/blob/master/src/conveniences/paint_signals.js
 * https://github.com/aunetx/blur-my-shell/blob/master/src/effects/corner.js
 * https://github.com/aunetx/blur-my-shell/blob/master/src/effects/corner.glsl
 * Copyright (C) Aurelien Hamy and Blur My Shell contributors.
 * Blur My Shell is licensed under GPL-3.0-or-later. This adaptation keeps the
 * same license and was modified for iWeather in 2026.
 */

const SURFACE_CORNER_RADIUS = 22;

const RoundedMaskEffect = GObject.registerClass({
    GTypeName: 'IWeatherRoundedMaskEffect',
}, class RoundedMaskEffect extends Clutter.ShaderEffect {
    constructor(shaderSource) {
        super();
        this._actorSizeSignalId = 0;
        this._radius = SURFACE_CORNER_RADIUS;
        this._scaleFactor = 1;
        this.set_shader_source(shaderSource);
    }

    setRadius(radius, scaleFactor = 1) {
        this._radius = radius;
        this._scaleFactor = scaleFactor;
        this._updateUniforms();
    }

    _updateUniforms() {
        const actor = this.get_actor();
        if (!actor)
            return;
        const width = Math.max(1, actor.width);
        const height = Math.max(1, actor.height);
        const radius = Math.min(this._radius * this._scaleFactor, width / 2, height / 2);
        this.set_uniform_value('width', parseFloat(width - 1e-6));
        this.set_uniform_value('height', parseFloat(height - 1e-6));
        this.set_uniform_value('radius', parseFloat(radius - 1e-6));
    }

    vfunc_set_actor(actor) {
        const oldActor = this.get_actor();
        if (oldActor && this._actorSizeSignalId)
            oldActor.disconnect(this._actorSizeSignalId);
        this._actorSizeSignalId = 0;
        super.vfunc_set_actor(actor);
        if (actor) {
            this._actorSizeSignalId = actor.connect(
                'notify::size', () => this._updateUniforms());
            this._updateUniforms();
        }
    }
});

function isUsableBlurApi(api) {
    if (!api?.BlurEffect || api?.BlurMode?.BACKGROUND === undefined)
        return false;

    try {
        return typeof api.BlurEffect === 'function' && Boolean(api.BlurEffect.$gtype);
    } catch (_error) {
        return false;
    }
}

function supportsProperty(effectType, propertyName) {
    try {
        return effectType.list_properties().some(property => property.name === propertyName);
    } catch (_error) {
        return false;
    }
}

export async function loadOptionalBlurModule() {
    try {
        const module = await import('gi://Blur?version=1.0');
        const candidate = module.default ?? module;
        return isUsableBlurApi(candidate) ? candidate : null;
    } catch (_error) {
        return null;
    }
}

export class WeatherGaussianBackdrop {
    constructor(target, surface, blurApi) {
        this._target = target;
        this._surface = surface;
        this._blurApi = blurApi;
        this._blurSurface = null;
        this._backgroundClone = null;
        this._windowClone = null;
        this._effect = null;
        this._maskEffect = null;
        this._signalIds = [];
        this._usesDynamicBlur = false;
        this._themeContext = null;
        this._unscaledRadius = 0;
        this._brightness = 1;
        this._repaintLaterId = 0;
        this._unredirectDisabled = false;
        this._destroyed = false;
    }

    async create() {
        if (!this._surface || !Main.uiGroup)
            return false;

        this._themeContext = St.ThemeContext.get_for_stage(global.stage);

        // This separate actor samples the desktop behind the popup instead
        // of the popup's own offscreen framebuffer during BoxPointer animation.
        this._blurSurface = new St.Widget({
            name: 'weather-ru-gaussian-blur-surface',
            style_class: 'weather-ru-gaussian-blur-surface',
            reactive: false,
            clip_to_allocation: true,
        });
        this._blurSurface.hide();
        Main.uiGroup.add_child(this._blurSurface);

        try {
            if (isUsableBlurApi(this._blurApi) &&
                supportsProperty(this._blurApi.BlurEffect, 'corner-radius')) {
                this._effect = new this._blurApi.BlurEffect({
                    mode: this._blurApi.BlurMode.BACKGROUND,
                    brightness: 1,
                    radius: 0,
                    corner_radius: 0,
                });
                this._usesDynamicBlur = true;
                this._blurSurface.add_effect(this._effect);
            } else {
                const backgroundGroup = Main.layoutManager?._backgroundGroup;
                if (!backgroundGroup)
                    throw new Error('Shell background group is unavailable');
                this._backgroundClone = new Clutter.Clone({
                    source: backgroundGroup,
                    reactive: false,
                });
                this._blurSurface.add_child(this._backgroundClone);
                if (global.window_group) {
                    this._windowClone = new Clutter.Clone({
                        source: global.window_group,
                        reactive: false,
                    });
                    this._blurSurface.add_child(this._windowClone);
                }
                this._effect = new Shell.BlurEffect({
                    mode: Shell.BlurMode.ACTOR,
                    brightness: 1,
                    radius: 0,
                });
                this._blurSurface.add_effect(this._effect);

                const shaderSource = await this._loadShaderSource();
                if (this._destroyed)
                    return false;
                this._maskEffect = new RoundedMaskEffect(shaderSource);
                this._blurSurface.add_effect(this._maskEffect);
            }
        } catch (error) {
            console.warn(`iWeather: blur effect is unavailable (${error})`);
            this._blurSurface.destroy();
            this._blurSurface = null;
            this._backgroundClone = null;
            this._windowClone = null;
            this._effect = null;
            this._maskEffect = null;
            this._themeContext = null;
            this._usesDynamicBlur = false;
            return false;
        }

        this._themeContext.connectObject(
            'notify::scale-factor', () => this._applyScaledEffectSettings(), this,
        );

        for (const [actor, signal] of [
            [this._surface, 'notify::allocation'],
            [this._surface, 'notify::mapped'],
            [this._target, 'notify::allocation'],
            [this._target, 'notify::mapped'],
            [this._target, 'notify::scale-x'],
            [this._target, 'notify::scale-y'],
            [this._target, 'notify::translation-x'],
            [this._target, 'notify::translation-y'],
            [this._target, 'notify::opacity'],
        ]) {
            if (actor)
                this._signalIds.push([actor, actor.connect(signal, () => this._syncGeometry())]);
        }

        this._placeBelowTarget();
        this._syncGeometry();
        this.update(0, 1);
        return true;
    }

    _loadShaderSource() {
        const shaderFile = Gio.File.new_for_uri(import.meta.url)
            .get_parent().get_child('weather-rounded-mask.glsl');
        return new Promise((resolve, reject) => {
            shaderFile.load_contents_async(null, (file, result) => {
                try {
                    const [loaded, contents] = file.load_contents_finish(result);
                    if (!loaded)
                        throw new Error('Rounded-mask shader could not be loaded');
                    resolve(new TextDecoder().decode(contents));
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    _placeBelowTarget() {
        if (!this._blurSurface || !Main.uiGroup)
            return;

        let sibling = this._target;
        while (sibling?.get_parent?.() && sibling.get_parent() !== Main.uiGroup)
            sibling = sibling.get_parent();
        Main.uiGroup.set_child_below_sibling(
            this._blurSurface,
            sibling?.get_parent?.() === Main.uiGroup ? sibling : null,
        );
    }

    _syncGeometry() {
        if (this._destroyed || !this._blurSurface || !this._surface)
            return;

        const [x, y] = this._surface.get_transformed_position();
        const [width, height] = this._surface.get_transformed_size();
        if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0)
            return;

        this._blurSurface.set_position(x, y);
        this._blurSurface.set_size(width, height);
        this._blurSurface.opacity = this._target?.opacity ?? 255;
        const baseWidth = Math.max(1, this._surface.width);
        if (this._usesDynamicBlur)
            this._effect.corner_radius = SURFACE_CORNER_RADIUS * width / baseWidth;
        for (const clone of [this._backgroundClone, this._windowClone]) {
            if (!clone)
                continue;
            const source = clone.source;
            clone.set_position(-x, -y);
            clone.set_size(
                Math.max(global.stage.width, source?.width ?? 0),
                Math.max(global.stage.height, source?.height ?? 0),
            );
        }
        this._placeBelowTarget();
        this.queueRepaint();
    }

    get_effect() {
        return this._effect;
    }

    backdrop_matches_surface() {
        if (!this._blurSurface || !this._surface)
            return false;
        const [surfaceX, surfaceY] = this._surface.get_transformed_position();
        const [surfaceWidth, surfaceHeight] = this._surface.get_transformed_size();
        const [blurX, blurY] = this._blurSurface.get_transformed_position();
        const [blurWidth, blurHeight] = this._blurSurface.get_transformed_size();
        return this._blurSurface.get_parent() === Main.uiGroup &&
            Math.abs(surfaceX - blurX) <= 1 && Math.abs(surfaceY - blurY) <= 1 &&
            Math.abs(surfaceWidth - blurWidth) <= 1 && Math.abs(surfaceHeight - blurHeight) <= 1;
    }

    uses_tint_layer() {
        return false;
    }

    uses_rounded_blur() {
        return Boolean(this._effect && (this._usesDynamicBlur || this._maskEffect));
    }

    set_tint(_tint, _colorOpacity = 0) {}

    update(radius = 0, brightness = 1) {
        if (this._destroyed || !this._effect)
            return;
        this._unscaledRadius = Math.max(0, radius);
        this._brightness = Math.max(0, brightness);
        this._applyScaledEffectSettings();
        this._syncGeometry();
        this.queueRepaint();
    }

    _applyScaledEffectSettings() {
        if (!this._effect)
            return;
        const scaleFactor = Math.max(1, this._themeContext?.scale_factor ?? 1);
        this._effect.radius = this._unscaledRadius * scaleFactor;
        this._effect.brightness = this._brightness;
        this._maskEffect?.setRadius(SURFACE_CORNER_RADIUS, scaleFactor);
        this.queueRepaint();
    }

    queueRepaint() {
        if (this._destroyed || !this._effect || !this._blurSurface)
            return;

        this._effect.queue_repaint();
        this._maskEffect?.queue_repaint();
        this._blurSurface.queue_redraw();
        if (this._repaintLaterId)
            return;

        // Shell's background blur may otherwise reuse a partially damaged
        // framebuffer while a child is dragged or a ScrollView is moving.
        // Blur My Shell likewise queues an idle repaint to avoid black or dark
        // rectangles during interactive updates.
        this._repaintLaterId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._repaintLaterId = 0;
            if (!this._destroyed && this._effect && this._blurSurface) {
                this._effect.queue_repaint();
                this._maskEffect?.queue_repaint();
                this._blurSurface.queue_redraw();
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    show() {
        if (this._destroyed || !this._blurSurface)
            return;
        this._syncGeometry();
        this._disableUnredirect();
        this._blurSurface.show();
    }

    hide() {
        this._blurSurface?.hide();
        this._restoreUnredirect();
    }

    _disableUnredirect() {
        if (this._unredirectDisabled)
            return;
        if (Meta.disable_unredirect_for_display)
            Meta.disable_unredirect_for_display(global.display);
        else if (global.compositor?.disable_unredirect)
            global.compositor.disable_unredirect();
        this._unredirectDisabled = true;
    }

    _restoreUnredirect() {
        if (!this._unredirectDisabled)
            return;
        if (Meta.enable_unredirect_for_display)
            Meta.enable_unredirect_for_display(global.display);
        else if (global.compositor?.enable_unredirect)
            global.compositor.enable_unredirect();
        this._unredirectDisabled = false;
    }

    destroy() {
        if (this._destroyed)
            return;
        this._destroyed = true;
        for (const [actor, signalId] of this._signalIds)
            actor.disconnect(signalId);
        this._signalIds = [];
        if (this._repaintLaterId)
            GLib.Source.remove(this._repaintLaterId);
        this._repaintLaterId = 0;
        this._blurSurface?.destroy();
        this._blurSurface = null;
        this._backgroundClone = null;
        this._windowClone = null;
        this._restoreUnredirect();
        this._themeContext?.disconnectObject(this);
        this._themeContext = null;
        this._effect = null;
        this._maskEffect = null;
        this._blurApi = null;
        this._surface = null;
        this._target = null;
    }
}

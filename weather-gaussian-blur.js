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

function shaderFloat(value) {
    const shaderValue = new GObject.Value();
    shaderValue.init(GObject.TYPE_FLOAT);
    shaderValue.set_float(value);
    return shaderValue;
}

const RoundedMaskEffect = GObject.registerClass({
    GTypeName: 'IWeatherRoundedMaskEffect',
}, class RoundedMaskEffect extends Clutter.ShaderEffect {
    constructor(shaderSource) {
        super();
        this._actorSizeSignalId = 0;
        this._radius = SURFACE_CORNER_RADIUS;
        this._scaleFactor = 1;
        this._uniforms = new Map();
        this._uniformsDirty = false;
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
        this._uniforms.set('width', width - 1e-6);
        this._uniforms.set('height', height - 1e-6);
        this._uniforms.set('radius', radius - 1e-6);
        this._uniformsDirty = true;
        this.queue_repaint();
    }

    _uploadUniforms() {
        if (!this._uniformsDirty || !this.get_actor())
            return;
        for (const [name, value] of this._uniforms)
            this.set_uniform_value(name, shaderFloat(value));
        this._uniformsDirty = false;
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

    vfunc_paint_target(paintNode, paintContext) {
        this._uploadUniforms();
        super.vfunc_paint_target(paintNode, paintContext);
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

function blurRadiusProperty(effectType) {
    if (supportsProperty(effectType, 'radius'))
        return 'radius';
    // GNOME Shell 45 exposed this property as sigma. GNOME Shell 46 renamed
    // it to radius, so keep the fallback compatible with both APIs.
    if (supportsProperty(effectType, 'sigma'))
        return 'sigma';
    return null;
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
        this._blurActor = null;
        this._backgroundClone = null;
        this._windowClone = null;
        this._effect = null;
        this._effectRadiusProperty = null;
        this._maskEffect = null;
        this._signalIds = [];
        this._usesDynamicBlur = false;
        this._themeContext = null;
        this._unscaledRadius = 0;
        this._brightness = 1;
        this._repaintLaterId = 0;
        this._unredirectDisabled = false;
        this._pendingShow = false;
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
                this._effectRadiusProperty = blurRadiusProperty(this._blurApi.BlurEffect);
                if (!this._effectRadiusProperty)
                    throw new Error('Rounded blur radius property is unavailable');
                const effectProperties = {
                    mode: this._blurApi.BlurMode.BACKGROUND,
                    brightness: 1,
                    corner_radius: 0,
                };
                effectProperties[this._effectRadiusProperty] = 0;
                this._effect = new this._blurApi.BlurEffect(effectProperties);
                this._usesDynamicBlur = true;
                this._blurSurface.add_effect(this._effect);
            } else {
                const backgroundGroup = Main.layoutManager?._backgroundGroup;
                if (!backgroundGroup)
                    throw new Error('Shell background group is unavailable');
                this._effectRadiusProperty = blurRadiusProperty(Shell.BlurEffect);
                if (!this._effectRadiusProperty)
                    throw new Error('Shell blur radius property is unavailable');
                const effectProperties = {
                    mode: Shell.BlurMode.ACTOR,
                    brightness: 1,
                };
                effectProperties[this._effectRadiusProperty] = 0;
                this._effect = new Shell.BlurEffect(effectProperties);

                const shaderSource = await this._loadShaderSource();
                if (this._destroyed)
                    return false;
                // Render clones into a child, blur that actor, then mask the
                // completed child texture on its parent. Shell's BACKGROUND
                // mode cannot be masked from JavaScript because it samples
                // the parent's offscreen framebuffer instead of the stage.
                this._blurActor = new St.Widget({
                    name: 'weather-ru-gaussian-blur-content',
                    reactive: false,
                    clip_to_allocation: true,
                });
                this._backgroundClone = new Clutter.Clone({
                    source: backgroundGroup,
                    reactive: false,
                });
                this._blurActor.add_child(this._backgroundClone);
                if (global.window_group) {
                    this._windowClone = new Clutter.Clone({
                        source: global.window_group,
                        reactive: false,
                    });
                    this._blurActor.add_child(this._windowClone);
                }
                this._blurActor.add_effect(this._effect);
                this._blurSurface.add_child(this._blurActor);
                this._maskEffect = new RoundedMaskEffect(shaderSource);
                this._blurSurface.add_effect(this._maskEffect);
            }
        } catch (error) {
            logError(error, 'iWeather blur effect is unavailable');
            this._blurSurface.destroy();
            this._blurSurface = null;
            this._blurActor = null;
            this._backgroundClone = null;
            this._windowClone = null;
            this._effect = null;
            this._effectRadiusProperty = null;
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
        this._signalIds.push([
            this._blurSurface,
            this._blurSurface.connect('notify::allocation', () => this._syncGeometry()),
        ]);

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
        this._blurActor?.set_position(0, 0);
        this._blurActor?.set_size(width, height);
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
        this._showIfAllocated();
        this.queueRepaint();
    }

    _showIfAllocated() {
        if (!this._pendingShow || this._destroyed || !this._blurSurface)
            return;
        // Clutter.ActorBox no longer exposes x1/x2 as JavaScript fields on
        // GNOME 50. Testing those fields kept this actor permanently hidden
        // even though set_size() had already assigned valid dimensions.
        const width = this._blurSurface.width;
        const height = this._blurSurface.height;
        if (!Number.isFinite(width) || !Number.isFinite(height) ||
            width <= 0 || height <= 0)
            return;
        this._pendingShow = false;
        this._disableUnredirect();
        this._blurSurface.show();
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
        const blurRadius = this._unscaledRadius * scaleFactor;
        if (this._effectRadiusProperty === 'sigma')
            this._effect.sigma = blurRadius / 2;
        else
            this._effect.radius = blurRadius;
        this._effect.brightness = this._brightness;
        this._maskEffect?.setRadius(SURFACE_CORNER_RADIUS, scaleFactor);
        this.queueRepaint();
    }

    queueRepaint() {
        if (this._destroyed || !this._effect || !this._blurSurface)
            return;

        this._effect.queue_repaint();
        this._maskEffect?.queue_repaint();
        this._blurActor?.queue_redraw();
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
                this._blurActor?.queue_redraw();
                this._blurSurface.queue_redraw();
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    show() {
        if (this._destroyed || !this._blurSurface)
            return;
        this._pendingShow = true;
        this._syncGeometry();
        this._showIfAllocated();
    }

    hide() {
        this._pendingShow = false;
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
        this._pendingShow = false;
        this._blurSurface?.destroy();
        this._blurSurface = null;
        this._blurActor = null;
        this._backgroundClone = null;
        this._windowClone = null;
        this._restoreUnredirect();
        this._themeContext?.disconnectObject(this);
        this._themeContext = null;
        this._effect = null;
        this._effectRadiusProperty = null;
        this._maskEffect = null;
        this._blurApi = null;
        this._surface = null;
        this._target = null;
    }
}

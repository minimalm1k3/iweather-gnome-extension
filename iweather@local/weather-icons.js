import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import St from 'gi://St';

export function createWeatherIcon({file, iconName, size, styleClass = ''}) {
    const iconSource = file?.query_exists(null)
        ? {gicon: new Gio.FileIcon({file})}
        : {icon_name: iconName};
    const icon = new St.Icon({
        ...iconSource,
        icon_size: size,
        style_class: `weather-ru-color-icon ${styleClass}`.trim(),
        y_align: Clutter.ActorAlign.CENTER,
    });
    return icon;
}

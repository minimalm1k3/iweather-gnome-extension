## GNOME Rounded Blur

A standalone library providing `Blur.BlurEffect` with corner radius support for GNOME Shell extensions. Basically it's
just copy of [ShellBlurEffect](https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/src/shell-blur-effect.c) with
corner mask and different gir namespace (`Blur`).

## Build & install 

### From source

```bash
cd gnome-rounded-blur
meson setup build
meson compile -C build
sudo meson install -C build
```

### Arch

```bash
yay -S gnome-rounded-blur
```

### Usage in GNOME Shell Extensions

After installation, you can use the library in your extension:

```javascript
import GObject from 'gi://GObject';
import Blur from 'gi://Blur';

const MyBlurEffect = GObject.registerClass({
    GTypeName: "MyBlurEffect"
}, class MyBlurEffect extends Blur.BlurEffect {
    constructor(params) {
        super({
            mode: Blur.BlurMode.BACKGROUND,
            radius: 30,
            brightness: 0.6,
            corner_radius: 14,  // From here you can set corner radius for blur
            ...params
        });
    }
});
```

## iWeather

The extension loads `Blur.BlurEffect` from the system GObject
Introspection repository when this library is installed. Its popup backdrop
uses `Blur.BlurMode.BACKGROUND` and sets `corner_radius` to the same 22 px
radius as the menu surface. The selected color is rendered by a separate
rounded actor above that effect. This keeps the tint aligned with the blur
mask instead of letting the Gaussian kernel fade it near the surface edges.

From the project root, build and install the extension with an ABI-matched,
privately bundled native library:

```bash
bash scripts/install.sh
```

To install the native library system-wide instead, use
`bash scripts/install-gnome-rounded-blur.sh` after installing the packages
listed above.

The native library is tied to the installed Mutter ABI. Rebuild the extension
bundle after a GNOME Shell/Mutter update. If the module cannot be loaded, the
extension uses a rounded CSS surface without framebuffer blur instead of
showing a square blurred rectangle.

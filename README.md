# iWeather

GNOME Shell weather extension with hourly and 10-day forecasts, optional
location detection, a wallet section, Figma Weather Icons artwork, and
Gaussian background blur powered by GNOME Shell.

## Install locally

From the project root, run:

```bash
bash scripts/install.sh
```

The installable archive contains only GJS, CSS, XML schemas, and artwork. It
does not contain native libraries or typelibs and requires no system
dependencies beyond GNOME Shell. The self-contained fallback clones the Shell
wallpaper and window layers, applies the stock Gaussian blur in actor mode, and
masks the result with a bundled GLSL rounded rectangle. It therefore keeps live
blur and rounded corners on a clean installation. If the optional system `gnome-rounded-blur`
module is already available, iWeather uses it automatically for live dynamic
background blur; it is never downloaded or installed by the extension.

Run `bash scripts/package.sh` to create a fresh archive without changing the
system. The script validates the XML schema and fails if a native library or
typelib accidentally enters the archive.

The weather PNGs in `iweather@local/assets/weather-icons-figma` are exported
from the Weather Icons library linked in [`ASSET-LICENSES.md`](ASSET-LICENSES.md).
The crypto artwork in `iweather@local/assets/wallet` is intentionally retained.

The dynamic blur fallback is adapted from
[`Blur My Shell`](https://github.com/aunetx/blur-my-shell), licensed under
GPL-3.0-or-later. Attribution is also kept in the distributed source file.

## Before publishing

The public source repository is listed in `iweather@local/metadata.json`.
Use a stable public UUID instead of `iweather@local` if the extension is going
to be maintained outside this local project.

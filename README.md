# iWeather

GNOME Shell weather extension with hourly and 10-day forecasts, optional
location detection, a wallet section, Weather Icons artwork, and Gaussian
background blur powered by GNOME Shell.

## Install locally

From the project root, run:

```bash
bash scripts/install.sh
```

The extension source lives at the repository root, so the same tree can be
reviewed and packaged directly by GNOME Extensions.

The installable archive contains only GJS, CSS, XML schemas, and artwork. It
does not contain native libraries or typelibs and requires no system
dependencies beyond GNOME Shell. The self-contained fallback clones the Shell
wallpaper and window layers, applies the stock Gaussian blur in actor mode, and
masks the result with a bundled GLSL rounded rectangle. It therefore keeps live
blur and rounded corners on a clean installation.

Run `bash scripts/package.sh` to create a fresh archive at
`build/iweather@local.shell-extension.zip` without changing the system. The
script validates the XML schema and fails if a native library or typelib
accidentally enters the archive.

The weather PNGs in `assets/weather-icons-figma` are exported from the Weather
Icons library linked in [`ASSET-LICENSES.md`](ASSET-LICENSES.md). The crypto
artwork in `assets/wallet` is intentionally retained.

The dynamic blur fallback is adapted from
[`Blur My Shell`](https://github.com/aunetx/blur-my-shell), licensed under
GPL-3.0-or-later. Attribution is also kept in the distributed source file.

## Release package

The archive produced by `scripts/package.sh` is the file to upload to
extensions.gnome.org. It contains no test harnesses, web previews, build
outputs, or native components. GNOME Shell compiles the included GSettings
schema when the extension is installed.

## Before publishing

The public source repository is listed in `metadata.json`.

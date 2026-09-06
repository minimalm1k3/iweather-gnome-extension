#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source_dir="$project_root/third_party/gnome-rounded-blur"
build_dir="${TMPDIR:-/tmp}/iweather-gnome-rounded-blur-build"
prefix="${GNOME_ROUNDED_BLUR_PREFIX:-/usr}"

if ! command -v meson >/dev/null 2>&1; then
    echo "meson is required; install the build dependencies from third_party/gnome-rounded-blur/README.md" >&2
    exit 1
fi

if [[ -f "$build_dir/build.ninja" ]]; then
    meson setup --reconfigure "$build_dir" "$source_dir" --prefix="$prefix"
else
    meson setup "$build_dir" "$source_dir" --prefix="$prefix"
fi
meson compile -C "$build_dir"
pkexec /usr/bin/meson install -C "$build_dir"
pkexec /usr/sbin/ldconfig

echo "Installed gnome-rounded-blur to $prefix"

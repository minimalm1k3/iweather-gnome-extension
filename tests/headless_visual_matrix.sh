#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
archive="$project_root/outputs/iweather@local.shell-extension.zip"

[[ -s "$archive" ]] || { echo "Missing package: $archive" >&2; exit 1; }

for visual_case in "26 0" "26 50" "26 100" "60 100"; do
    read -r opacity blur <<<"$visual_case"
    case_root="$(mktemp -d /tmp/iweather-package-check.XXXXXX)"
    trap 'rm -rf -- "$case_root"' EXIT
    extension_dir="$case_root/extension"
    mkdir -p "$extension_dir"
    unzip -q -o "$archive" -d "$extension_dir"
    [[ ! -e "$extension_dir/schemas/gschemas.compiled" ]]
    ! find "$extension_dir" -type f \( -name '*.so' -o -name '*.so.*' -o -name '*.typelib' \) -print -quit | rg -q .
    glib-compile-schemas --strict "$extension_dir/schemas"
    GSETTINGS_BACKEND=memory GSETTINGS_SCHEMA_DIR="$extension_dir/schemas" gsettings set org.gnome.shell.extensions.weather-ru background-opacity "$opacity"
    GSETTINGS_BACKEND=memory GSETTINGS_SCHEMA_DIR="$extension_dir/schemas" gsettings set org.gnome.shell.extensions.weather-ru background-blur "$blur"
    rm -rf -- "$case_root"
    trap - EXIT
done

for file in "$project_root"/iweather@local/*.js; do
    node --check "$file"
done
glib-compile-schemas --strict --dry-run "$project_root/iweather@local/schemas"
echo "Package and blur settings matrix validated"

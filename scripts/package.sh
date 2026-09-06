#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
output="${1:-$project_root/build/iweather@local.shell-extension.zip}"
if [[ "$output" != /* ]]; then
    output="$(pwd)/$output"
fi
staging_dir="$(mktemp -d "${TMPDIR:-/tmp}/iweather-package.XXXXXX")"

cleanup() {
    rm -rf -- "$staging_dir"
}
trap cleanup EXIT

for source_path in \
    extension.js \
    metadata.json \
    prefs.js \
    stylesheet.css \
    weather-gaussian-blur.js \
    weather-icons.js \
    weather-rounded-mask.glsl \
    assets \
    schemas; do
    cp -a "$project_root/$source_path" "$staging_dir/"
done
cp "$project_root/LICENSE" "$staging_dir/LICENSE"
cp "$project_root/ASSET-LICENSES.md" "$staging_dir/ASSET-LICENSES.md"
glib-compile-schemas --strict --dry-run "$staging_dir/schemas"

if find "$staging_dir" -type f \( -name '*.so' -o -name '*.so.*' -o -name '*.typelib' \) -print -quit | rg -q .; then
    echo "The extension archive must not contain native libraries or typelibs" >&2
    exit 1
fi

mkdir -p "$(dirname -- "$output")"
(
    cd "$staging_dir"
    zip -q -FS -r "$output" .
)

echo "Created $output"

#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
archive="$project_root/outputs/iweather@local.shell-extension.zip"
case_root="$(mktemp -d /tmp/iweather-headless-smoke.XXXXXX)"
extension_dir="$case_root/gnome-shell/extensions/iweather@local"
config_dir="$case_root/config"
log_file="$case_root/gnome-shell.log"

cleanup() {
    rm -rf -- "$case_root"
}
trap cleanup EXIT

mkdir -p "$extension_dir" "$config_dir"
unzip -q -o "$archive" -d "$extension_dir"
glib-compile-schemas --strict "$extension_dir/schemas"

set +e
env XDG_DATA_HOME="$case_root" XDG_CONFIG_HOME="$config_dir" \
    timeout 12s dbus-run-session -- bash -lc "
        gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark'
        gsettings set org.gnome.shell enabled-extensions \"['iweather@local']\"
        GSETTINGS_SCHEMA_DIR='$extension_dir/schemas' gsettings set org.gnome.shell.extensions.weather-ru background-blur 100
        gnome-shell --headless --virtual-monitor 500x720 --wayland
    " >"$log_file" 2>&1
status=$?
set -e

if [[ $status -ne 0 && $status -ne 124 ]]; then
    cat "$log_file" >&2
    exit "$status"
fi

if rg -n "JS ERROR|SyntaxError|TypeError|ReferenceError|GNOME Shell-CRITICAL|Extension .*Error|blur effect is unavailable" "$log_file"; then
    cat "$log_file" >&2
    exit 1
fi

echo "GNOME Shell headless extension smoke test passed"

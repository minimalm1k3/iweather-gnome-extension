#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
extension_zip="$project_root/build/iweather@local.shell-extension.zip"
packager="$project_root/scripts/package.sh"
extension_uuid="iweather@local"

if ! command -v gnome-extensions >/dev/null 2>&1; then
    echo "gnome-extensions is required; install GNOME Shell before installing this project" >&2
    exit 1
fi

echo "Packaging extension without bundled native code..."
bash "$packager" "$extension_zip"

echo "Installing $extension_uuid..."
gnome-extensions install --force "$extension_zip"
gnome-extensions enable "$extension_uuid"

cat <<'EOF'

Installation complete. On Wayland, log out and back in so GNOME Shell loads
the new extension code. The extension uses its bundled rounded Gaussian blur
fallback and does not install native system components.
EOF

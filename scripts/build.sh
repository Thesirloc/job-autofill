#!/usr/bin/env bash
#
# Build the extension into dist/jobfill-v<version>.zip and dist/unpacked/.
# Used both locally (Git Bash, WSL, macOS, Linux) and by CI.
#
# Output:
#   dist/unpacked/      — load this directory via chrome://extensions "Load unpacked"
#   dist/jobfill-vX.Y.Z.zip — upload this to the Chrome Web Store
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' manifest.json | head -n 1)
if [ -z "$VERSION" ]; then
  echo "Could not read version from manifest.json" >&2
  exit 1
fi

NAME="jobfill-v${VERSION}"
DIST="${ROOT}/dist"
UNPACKED="${DIST}/unpacked"
ZIP="${DIST}/${NAME}.zip"

# Allowlist — only these top-level paths ship in the extension package.
INCLUDE=(
  manifest.json
  background
  content
  icons
  lib
  options
  popup
)

rm -rf "$DIST"
mkdir -p "$UNPACKED"

for item in "${INCLUDE[@]}"; do
  if [ ! -e "$item" ]; then
    echo "Missing required path: $item" >&2
    exit 1
  fi
  cp -r "$item" "$UNPACKED/"
done

if ! command -v zip >/dev/null 2>&1; then
  echo "zip command not found. On Windows, run scripts/build.ps1 from PowerShell instead." >&2
  exit 1
fi

(cd "$UNPACKED" && zip -rq "$ZIP" .)

echo "Built  : $ZIP"
echo "Unpack : $UNPACKED"
echo "Version: $VERSION"

#!/usr/bin/env bash
# Installs the shared libraries Playwright's Chromium needs, without root.
#
# `npx playwright install --with-deps` requires sudo. This script instead uses
# `apt-get download` (which does not), unpacks the .deb files into
# .playwright-libs/ inside the repo, and playwright.config.ts adds that
# directory to LD_LIBRARY_PATH automatically. The directory is gitignored.
#
#   ./scripts/setup-e2e.sh     # idempotent; safe to re-run
#   npx playwright install chromium
#   npm run test:e2e
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/.playwright-libs"
LIBDIR="$DEST/root/usr/lib/x86_64-linux-gnu"

if [ -f "$LIBDIR/libnspr4.so" ]; then
	echo "Chromium shared libraries already present in $LIBDIR"
	exit 0
fi

mkdir -p "$DEST/debs" "$DEST/root"
cd "$DEST/debs"

# libnspr4 + libnss3 provide libnspr4 / libnss3 / libnssutil3;
# libasound2t64 provides libasound.
apt-get download libnspr4 libnss3 libasound2t64

for deb in ./*.deb; do
	dpkg-deb -x "$deb" "$DEST/root"
done

if [ ! -f "$LIBDIR/libnspr4.so" ]; then
	echo "Unexpected package layout: $LIBDIR/libnspr4.so not found" >&2
	exit 1
fi

echo "Installed Chromium shared libraries into $LIBDIR"
echo "npm run test:e2e picks this up automatically."
#!/usr/bin/env bash
# MCPB is a ZIP with manifest.json. Python's standard library avoids downloading
# a mutable packer and its unrelated signing/editor dependencies.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run check:release
npm run build
STAGE=$(mktemp -d "${TMPDIR:-/tmp}/fub-mcp-build.XXXXXX")
trap 'rm -rf "$STAGE"' EXIT
cp mcpb/manifest.json "$STAGE/manifest.json"
cp -R dist docs gpt skills claude-setup "$STAGE/"
cp package.json package-lock.json LICENSE README.md PRIVACY.md CHANGELOG.md SECURITY.md "$STAGE/"
(cd "$STAGE" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund)
python3 scripts/pack-mcpb.py "$STAGE"

#!/usr/bin/env bash
# Builds fub-mcp-<version>.mcpb: a one-click Claude Desktop extension bundle.
# Stages compiled output + production-only node_modules, then packs with the
# official MCPB CLI. Output lands in the repo root (gitignored).
set -euo pipefail

cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./package.json').version")
MANIFEST_VERSION=$(node -p "require('./mcpb/manifest.json').version")
if [ "$VERSION" != "$MANIFEST_VERSION" ]; then
  echo "Version mismatch: package.json=$VERSION mcpb/manifest.json=$MANIFEST_VERSION" >&2
  exit 1
fi

npm run build
STAGE=.mcpb-build
rm -rf "$STAGE" && mkdir "$STAGE"
cp mcpb/manifest.json "$STAGE/manifest.json"
cp -R dist "$STAGE/dist"
cp package.json package-lock.json "$STAGE/"
(cd "$STAGE" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund)

npx -y @anthropic-ai/mcpb validate "$STAGE/manifest.json"
npx -y @anthropic-ai/mcpb pack "$STAGE" "fub-mcp-$VERSION.mcpb"
npx -y @anthropic-ai/mcpb info "fub-mcp-$VERSION.mcpb"

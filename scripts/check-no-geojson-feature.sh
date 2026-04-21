#!/usr/bin/env bash
# Regression guard: prevent reintroduction of local GeoJSONFeature interface definitions.
# Use SafeFeature from @debrief/utils or schema types from @debrief/schemas instead.
#
# Wired into task lint by spec 214-utils-drift-guard.
#
# Usage: bash scripts/check-no-geojson-feature.sh
# Exit code 0 = clean, 1 = violations found

set -euo pipefail

# Search for interface/type definitions (not imports or re-exports)
VIOLATIONS=$(grep -rn "interface GeoJSONFeature\b" \
  --include="*.ts" --include="*.tsx" \
  apps/ shared/ services/ \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  | grep -v "// canonical" \
  | grep -v "shared/utils/src/types.ts" \
  || true)

if [ -n "$VIOLATIONS" ]; then
  echo "❌ GeoJSONFeature regression guard failed!"
  echo ""
  echo "The following files define a local GeoJSONFeature interface."
  echo "Use SafeFeature from @debrief/utils or schema types from @debrief/schemas instead."
  echo ""
  echo "$VIOLATIONS"
  exit 1
fi

echo "✅ No local GeoJSONFeature definitions found (regression guard passed)"

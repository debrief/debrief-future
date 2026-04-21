#!/usr/bin/env bash
# Regression guard: prevent reintroduction of local GeoJSONFeature interface definitions.
# Use `RawGeoJSONFeature` from `@debrief/schemas` (parse-boundary) or narrow
# via existing `DebriefFeature` type guards.
#
# Wired into task lint by spec 214-utils-drift-guard; tightened by spec
# 204-rawgeojsonfeature-linkml (removed the `shared/utils/src/types.ts`
# exclusion — that file's interface is deleted, so the exclusion is
# no longer necessary and keeping it would let a future regression in
# that file slip past the guard).
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
  || true)

if [ -n "$VIOLATIONS" ]; then
  echo "❌ GeoJSONFeature regression guard failed!"
  echo ""
  echo "The following files define a local GeoJSONFeature interface."
  echo "Use \`RawGeoJSONFeature\` from \`@debrief/schemas\` (parse-boundary) or"
  echo "narrow via existing \`DebriefFeature\` type guards (isDebriefFeature,"
  echo "isTrackFeature, isReferenceLocation) in @debrief/schemas/unions."
  echo ""
  echo "$VIOLATIONS"
  exit 1
fi

echo "✅ No local GeoJSONFeature definitions found (regression guard passed)"

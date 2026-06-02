#!/usr/bin/env bash
# Regression guard: prevent reintroduction of hand-written, schema-adjacent
# GeoJSON feature types. Use `RawGeoJSONFeature` from `@debrief/schemas`
# (result-carrying, parse-boundary) or the schema-derived `IngressFeature` /
# `IngressFeatureCollection` (permissive ingress, geometry may be null), or
# narrow via existing `DebriefFeature` type guards.
#
# Wired into task lint by spec 214-utils-drift-guard; tightened by spec
# 204-rawgeojsonfeature-linkml (removed the `shared/utils/src/types.ts`
# exclusion — that file's interface is deleted, so the exclusion is
# no longer necessary and keeping it would let a future regression in
# that file slip past the guard); extended by spec 212-linkml-safe-feature-types
# to also block the hand-written `Safe*` family.
#
# Usage: bash scripts/check-no-geojson-feature.sh
# Exit code 0 = clean, 1 = violations found

set -euo pipefail

# Search for interface/type definitions (not imports or re-exports) of either
# the legacy `GeoJSONFeature` (#204) or the `Safe(Feature|Geometry|FeatureCollection)`
# family (#212). `\b` word-boundaries keep `RawGeoJSONFeature` /
# `IngressFeature` (the sanctioned replacements) out of the match.
VIOLATIONS=$(grep -rnE \
  "(interface|type)[[:space:]]+(GeoJSONFeature|Safe(Feature|Geometry|FeatureCollection))\b" \
  --include="*.ts" --include="*.tsx" \
  apps/ shared/ services/ \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  | grep -v "// canonical" \
  || true)

if [ -n "$VIOLATIONS" ]; then
  echo "❌ Hand-written GeoJSON feature-type regression guard failed!"
  echo ""
  echo "The following files define a hand-written GeoJSONFeature / Safe* type."
  echo "Use \`RawGeoJSONFeature\` from \`@debrief/schemas\` (result-carrying /"
  echo "parse-boundary), the schema-derived \`IngressFeature\` /"
  echo "\`IngressFeatureCollection\` (permissive ingress, geometry may be null),"
  echo "or narrow via existing \`DebriefFeature\` type guards (isDebriefFeature,"
  echo "isTrackFeature, isReferenceLocation) in @debrief/schemas/unions."
  echo ""
  echo "$VIOLATIONS"
  exit 1
fi

echo "✅ No hand-written GeoJSONFeature / Safe* definitions found (regression guard passed)"

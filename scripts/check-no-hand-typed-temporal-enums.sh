#!/usr/bin/env bash
# Regression guard: prevent reintroduction of hand-typed DisplayMode /
# PlaybackState declarations and legacy-vocabulary ('normal'|'snailTrail')
# translation ternaries. Schema-rooted enums come from @debrief/schemas.
#
# Wired into task lint by spec 205-displaymode-playbackstate-linkml;
# mirrors the scripts/check-no-geojson-feature.sh precedent established
# by #204/#214.
#
# Usage: bash scripts/check-no-hand-typed-temporal-enums.sh
# Exit code 0 = clean, 1 = violations found

set -euo pipefail

# Hand-typed declarations anywhere outside the generated-artefacts tree.
DECL_VIOLATIONS=$(grep -rnE '^(export\s+)?type\s+(DisplayMode|PlaybackState)\b' \
  --include="*.ts" --include="*.tsx" \
  apps/ shared/ services/ \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  | grep -v "shared/schemas/src/generated/" \
  || true)

# Legacy-vocabulary translation ternaries (the 'normal'|'snailTrail' family).
TRANSLATOR_VIOLATIONS=$(grep -rnE "=== 'snailTrail'|=== 'normal' \\?|'trail' : 'normal'|'snailTrail' : 'normal'" \
  --include="*.ts" --include="*.tsx" \
  apps/ shared/ services/ \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  | grep -v "shared/schemas/src/generated/" \
  | grep -v "docs/" \
  || true)

if [ -n "$DECL_VIOLATIONS" ] || [ -n "$TRANSLATOR_VIOLATIONS" ]; then
  echo "❌ DisplayMode/PlaybackState regression guard failed!"
  echo ""
  echo "The following declarations or translators violate the schema-rooted"
  echo "enum contract established by Feature 205. Use \`DisplayMode\` /"
  echo "\`PlaybackState\` imported from \`@debrief/schemas\` (template-literal"
  echo "types derived from the generated \`DisplayModeEnum\` / \`PlaybackStateEnum\`)."
  echo ""
  if [ -n "$DECL_VIOLATIONS" ]; then
    echo "Hand-typed declarations:"
    echo "$DECL_VIOLATIONS"
    echo ""
  fi
  if [ -n "$TRANSLATOR_VIOLATIONS" ]; then
    echo "Legacy-vocabulary translators:"
    echo "$TRANSLATOR_VIOLATIONS"
  fi
  exit 1
fi

echo "✅ No hand-typed DisplayMode/PlaybackState or legacy translators found (regression guard passed)"

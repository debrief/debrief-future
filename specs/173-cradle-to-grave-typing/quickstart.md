# Quickstart: Cradle-to-Grave Typing

**Feature:** 173-cradle-to-grave-typing

## Verification Commands

### Check for prohibited patterns (Python)

```bash
# Find remaining dict[str, Any] in tool functions
uv run ruff check --select ANN --statistics services/calc/ services/io/ services/stac/

# Find feature.get("properties") patterns (should be zero after migration)
grep -rn 'feature\.get("properties"' services/calc/ services/io/ services/stac/

# Find dict[str, Any] return types in tool functions
grep -rn 'list\[dict\[str, Any\]\]' services/calc/debrief_calc/tools/

# Find Feature = dict[str, Any] alias
grep -rn 'Feature = dict' services/io/
```

### Check for prohibited patterns (TypeScript)

```bash
# Find propsRecord usage (should be zero after migration)
grep -rn 'propsRecord' apps/vscode/src/ apps/web-shell/src/

# Find as unknown as DebriefFeature casts
grep -rn 'as unknown as DebriefFeature' apps/vscode/src/

# Find Record<string, unknown> on domain data
grep -rn 'as Record<string, unknown>' apps/vscode/src/ shared/components/src/
```

### Run type checkers

```bash
# Python strict type checking
uv run pyright

# TypeScript type checking
pnpm -r typecheck
```

### Run full CI suite

```bash
task verify
```

## Migration Checklist (Per Tool)

For each Python calc tool being migrated:

1. Change function signature: `features: list[dict[str, Any]]` → `features: list[TrackFeature]` (or appropriate type)
2. Change return type: `list[dict[str, Any]]` → `list[TrackFeature]`
3. Replace `feature.get("properties", {}).get("name")` → `feature.properties.platform_name`
4. Replace `feature["geometry"]["coordinates"]` → `feature.geometry.coordinates`
5. Run `uv run pyright` — fix type errors
6. Run `uv run pytest` — fix test failures
7. Update golden fixtures if needed

For each TypeScript tool being migrated:

1. Change function signature to accept specific feature type
2. Add type guard at function entry: `if (!isTrackFeature(feature)) throw ...`
3. Replace `propsRecord(f).platform_name` → `feature.properties.platform_name`
4. Remove `import { propsRecord } from '../utils/featureProps'`
5. Run `pnpm -r typecheck` — fix type errors
6. Run `pnpm test` — fix test failures

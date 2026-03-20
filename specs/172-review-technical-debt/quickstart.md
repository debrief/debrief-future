# Quickstart: Review Technical Debt

**Feature**: 172-review-technical-debt

## Prerequisites

- Node.js 18+, pnpm 9+
- Python 3.11+, uv
- Access to the debrief-future monorepo

## Verification Commands

### After dependency alignment (User Stories 1, 3)

```bash
# Verify npm dependency consistency
pnpm install
pnpm lint

# Verify Python workspace alignment
uv sync
uv run ruff check .
uv run pytest
```

### After type consolidation (User Story 2)

```bash
# Search for remaining GeoJSONFeature definitions (should find only SafeFeature)
grep -r "interface GeoJSONFeature" --include="*.ts" shared/ apps/ services/
# Expected: no results

# Verify TimeRange has one definition
grep -r "interface TimeRange" --include="*.ts" shared/ apps/ services/
# Expected: one result in services/session-state/src/types/temporal.ts

# Verify MCPToolDefinition has one definition
grep -r "interface MCPToolDefinition" --include="*.ts" shared/ apps/ services/
# Expected: one result in shared/utils/
```

### After ESLint unification (User Story 4)

```bash
# Run lint across all packages — none should be skipped
pnpm lint
```

### After coverage thresholds (User Story 5)

```bash
# Verify coverage enforcement
cd services/config && uv run pytest --cov --cov-fail-under=80
cd services/calc && uv run pytest --cov --cov-fail-under=80
```

### After cross-layer cleanup (User Story 6)

```bash
# Verify no service-layer imports from @debrief/components
grep -r "from '@debrief/components" --include="*.ts" apps/vscode/src/services/
# Expected: no results

# Verify no cross-app relative imports
grep -r "from '.*vscode/src/" --include="*.ts" apps/web-shell/
# Expected: no results
```

### Full CI verification

```bash
task verify
```

## Implementation Order

1. Dependency version alignment (smallest blast radius)
2. Python workspace fixes (small config changes)
3. Coverage thresholds (small config changes)
4. ESLint unification (config + possible lint fixes)
5. Type consolidation (larger refactor, many file touches)
6. Cross-layer import cleanup (architectural, depends on type consolidation)
7. Assessment guide update (documentation, can be done anytime)

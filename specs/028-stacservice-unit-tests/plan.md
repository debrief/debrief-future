# Implementation Plan: stacService Unit Tests

**Branch**: `claude/add-speckit-unit-tests-bnfuc` | **Date**: 2026-01-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/028-stacservice-unit-tests/spec.md`

## Summary

Add comprehensive unit tests for `apps/vscode/src/services/stacService.ts` to achieve >80% code coverage. Tests will invoke actual service methods with mocked file system operations, covering all 10 public methods and edge cases identified in GitHub issue #98.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code Extension)
**Primary Dependencies**: Vitest (test runner), @vitest/coverage-v8 (coverage)
**Storage**: N/A (tests mock file system operations)
**Testing**: Vitest with `vi.mock('fs')` for isolation
**Target Platform**: VS Code Extension (Node.js environment)
**Project Type**: Single test file addition
**Performance Goals**: N/A (test suite, not runtime code)
**Constraints**: Tests must not access real file system
**Scale/Scope**: ~60 test cases across 10 method groups

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| VI. Testing | Services require unit tests | **ENABLES** | This feature directly fulfills this requirement |
| VI. Testing | CI MUST pass | PASS | Tests will be added to CI |
| VII. Test-Driven | Tests before implementation | PASS | Test spec defined before coding |
| VII. Test-Driven | Tests are the spec | PASS | Spec defines test scenarios |
| I. Reliability | No silent failures | PASS | Tests verify explicit error handling |
| XIII. Contribution | CI MUST pass | PASS | Tests added to existing CI workflow |

**Gate Status**: PASS - This feature directly supports Constitution Article VI (Testing).

## Project Structure

### Documentation (this feature)

```text
specs/028-stacservice-unit-tests/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
apps/vscode/
├── src/services/
│   └── stacService.ts        # Target file (720 lines)
└── tests/unit/
    ├── stacService.test.ts   # NEW: Comprehensive unit tests
    └── stacService.shapes.test.ts  # Existing: Feature categorization tests
```

**Structure Decision**: Single test file addition to existing test directory. No new directories needed. Follows established VS Code extension test patterns.

## Media Components

None - backend/infrastructure feature (test suite addition).

This feature has no visual components. The deliverable is a test file, not UI code.

## Complexity Tracking

No violations. This is a straightforward test-writing task that:
- Adds a single test file
- Uses existing test infrastructure (Vitest)
- Follows established mocking patterns
- Has clear acceptance criteria (>80% coverage)

## Implementation Approach

### Phase 1: Test Infrastructure

1. Create `stacService.test.ts` with proper Vitest setup
2. Implement mock helpers for fs operations
3. Define mock STAC data structures

### Phase 2: Core Read Methods

Priority: Critical/High methods first

1. `loadPlotData()` - Critical (bug prevention)
2. `validateStorePath()` - High
3. `listCatalogs()` - High
4. `listItems()` - High
5. `loadPlot()` - High

### Phase 3: Write Methods

Priority: Medium

6. `addAsset()` - Medium
7. `addFeatures()` - Medium
8. `hasAsset()` - Medium
9. `saveTrackColors()` - Medium

### Phase 4: Utility & Coverage

10. `clearCache()` - Low
11. Coverage verification (>80% target)
12. CI integration verification

## Verification

```bash
# Run tests
cd apps/vscode && pnpm test

# Run with coverage
cd apps/vscode && pnpm test --coverage

# Verify specific file coverage
# Target: >80% line coverage for stacService.ts
```

## Dependencies

- Vitest (already installed)
- @vitest/coverage-v8 (verify installed, add if missing)

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Mocking complexity | Use established patterns from shapes.test.ts |
| Cache behavior testing | Clear cache in beforeEach, verify calls with vi.fn() |
| Edge case discovery | Follow spec.md test scenarios exactly |

## Next Steps

After `/speckit.plan`:
1. Run `/speckit.tasks` to generate task breakdown
2. Implement tests following priority order
3. Verify coverage meets >80% threshold

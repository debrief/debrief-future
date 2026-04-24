# Implementation Plan: Import Handler Warnings for Unregistered Platforms

**Branch**: `182-import-platform-warnings` | **Date**: 2026-04-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/182-import-platform-warnings/spec.md`

## Summary

Add a post-parse validation step to the import pipeline that checks all extracted `platform_id` values against the platform registry (#180) and emits deduplicated `UNREGISTERED_PLATFORM` warnings. The import always succeeds — warnings are advisory only. This gives analysts a clear list of platforms needing registry entries for full metadata enrichment in downstream features (#183, #184).

## Technical Context

**Language/Version**: Python 3.11  
**Primary Dependencies**: `debrief-data` (platform registry loader), `pydantic>=2.12.5` (existing), `debrief-schemas` (existing)  
**Storage**: N/A (no new storage — warnings are returned in-memory on `ImportResult`)  
**Testing**: pytest with existing fixtures in `services/io/tests/`  
**Target Platform**: Linux (CI), macOS/Windows (developer)  
**Project Type**: Python workspace member (`services/io/`)  
**Performance Goals**: N/A — registry lookup is O(1) hash table per unique platform ID; negligible overhead  
**Constraints**: Must not break existing imports; must handle missing/corrupt registry gracefully  
**Scale/Scope**: ~10 registered platforms currently; typical import file has 1-20 unique platform IDs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Notes |
|---------|--------|-------|
| I. Defence-Grade Reliability | PASS | No silent failures — unregistered platforms produce explicit warnings. Offline by default — registry is a local file. |
| II. Schema Integrity | N/A | No schema changes in this feature (that's #181). |
| III. Data Sovereignty | PASS | Source files are never modified. No new data persistence. Warnings are transient in-memory. |
| IV. Architectural Boundaries | PASS | Change is entirely within the `services/io` Python service layer. No UI, no frontend changes. |
| V. Extensibility | PASS | No vendor lock-in. Registry is a standard JSON file with pure-Python loader. |
| VI. Testing | PASS | Unit tests for validation logic + integration tests for import pipeline. Plan includes both. |
| VII. Test-Driven AI | PASS | Tests will be written before implementation (see quickstart.md). |
| VIII. Documentation | PASS | Spec written before code. Warning code documented in data model. |
| IX. Dependencies | PASS | Adding `debrief-data` — an in-repo workspace member, not an external dependency. Already vetted for #180. |
| X. Security | PASS | No secrets, no network access. Local file operations only. |
| XI. Internationalisation | N/A | Warning messages are programmatic (code + platform ID), not user-facing strings requiring translation. |
| XIII. Contribution Standards | PASS | Atomic commits, PR review, CI must pass. |
| XV. Strict Type Safety | PASS | All new code will have explicit type annotations. `PlatformRegistry` API is already fully typed. |

**Gate result**: PASS — no violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/182-import-platform-warnings/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: technical research
├── data-model.md        # Phase 1: data model
├── contracts/           # Phase 1: API contracts
│   └── validate-platforms.md
├── quickstart.md        # Phase 1: implementation guide
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
services/io/
├── pyproject.toml                          # Add debrief-data dependency
├── src/debrief_io/
│   ├── import_catalog.py                   # Add registry validation call after parse
│   └── models.py                           # No changes (ImportWarning already sufficient)
└── tests/
    ├── conftest.py                         # Add registry fixtures
    ├── test_import_catalog.py              # Add integration tests
    └── test_platform_validation.py         # New: unit tests for validation logic
```

**Structure Decision**: All changes are within the existing `services/io/` workspace member. A new `test_platform_validation.py` isolates the validation logic unit tests from the existing integration test file. The validation function itself lives in `import_catalog.py` alongside the existing import pipeline — it's a single internal function, not complex enough to warrant a separate module.

## Media Components

None - backend/infrastructure feature

## Storybook E2E Testing

None - no interactive UI components

## VS Code Webview E2E Testing

None - no extension workflow changes

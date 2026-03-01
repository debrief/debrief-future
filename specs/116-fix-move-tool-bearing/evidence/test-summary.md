---
feature: "116-fix-move-tool-bearing"
captured_at: "2026-03-01T12:00:00Z"
git_sha: "dc53f41"
tests_passed: 75
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: PROV Log Input Snapshot for Mutation Replay

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 75 |
| Passed | 75 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | N/A |

## Test Breakdown

### InputFeatureState Model (test_provenance.py)

| Test | Status |
|------|--------|
| Create InputFeatureState with geometry and properties | Pass |
| Create InputFeatureState without properties (null) | Pass |
| Serializes to camelCase JSON (featureId, not feature_id) | Pass |
| populate_by_name allows Python field names | Pass |

### LogEntry with InputState (test_provenance.py)

| Test | Status |
|------|--------|
| LogEntry with inputState serializes to camelCase | Pass |
| LogEntry without inputState serializes as null | Pass |

### create_log_entry with input_state (test_provenance.py)

| Test | Status |
|------|--------|
| Accepts and stores input_state parameter | Pass |
| Defaults to None when input_state not provided | Pass |

### LogEntry Round-Trip (test_provenance.py)

| Test | Status |
|------|--------|
| Python -> JSON -> Python preserves inputState | Pass |
| Round-trip preserves null inputState | Pass |

### _capture_input_state Helper (test_executor.py)

| Test | Status |
|------|--------|
| Captures geometry and non-provenance properties | Pass |
| Excludes provenance from captured properties | Pass |
| Handles missing feature ID (uses "unknown") | Pass |
| Deep-copies geometry (mutations don't affect snapshot) | Pass |
| Empty properties (only provenance) returns None | Pass |

### Executor InputState Integration (test_executor.py)

| Test | Status |
|------|--------|
| Mutation tool gets inputState attached | Pass |
| Non-mutation tool gets inputState=null | Pass |
| Capture happens BEFORE handler (pre-mutation geometry) | Pass |

### Mutation Convention (test_executor.py)

| Test | Status |
|------|--------|
| set-track-color (mutation) gets inputState automatically | Pass |
| track-stats (non-mutation) gets inputState=null | Pass |

### Chained Mutations (test_executor.py)

| Test | Status |
|------|--------|
| Second inputState reflects post-first-move geometry | Pass |

### Move-Shape InputState (test_move_shape.py)

| Test | Status |
|------|--------|
| Circle: inputState contains original center and polygon geometry | Pass |
| Vector: inputState contains original origin property | Pass |
| Text: inputState contains original Point geometry | Pass |

## Key Scenarios Verified

- **Pre-mutation capture**: InputState snapshots geometry BEFORE the handler mutates coordinates, verified by comparing stored center with output center
- **Mutation convention**: ALL mutation tools (output_kind starting with "mutation/") automatically get inputState; non-mutation tools get null
- **Chained operations**: Each operation stores its own independent inputState from the geometry at that step, not the original or final position
- **Serialization round-trip**: InputState survives Python model -> JSON dict -> Python model without data loss
- **Deep copy safety**: Geometry mutations after snapshot don't affect the stored state

## Known Issues

- None

## Environment

- Runner: pytest 9.0.2
- Branch: claude/fix-move-tool-A7qQo
- Date: 2026-03-01

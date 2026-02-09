# Test Summary: PROV Schema Foundation (#070)

## Test Results

| Service | Passed | Failed | Skipped | Total |
|---------|--------|--------|---------|-------|
| calc    | 312    | 0      | 1       | 313   |
| stac    | 6      | 0      | 0       | 6     |
| **Total** | **318** | **0** | **1** | **319** |

## Key Test Scenarios Verified

### LogEntry Model (7 tests)
- Create with full PROV fields
- Invalid duration format rejected
- camelCase JSON serialization
- Fixture validation (3 valid, 2 invalid)
- Round-trip: Python → JSON → Python (SC-007)

### Provenance Functions (22 tests)
- create_log_entry: basic, parameters, typed params, custom timestamp, multiple sources, custom activity ID, generated outputs
- attach_log_entry: creates array, appends to array, wraps legacy dict, shared activity ID, ISO duration, camelCase keys
- Duration conversion: whole seconds, fractional, small fractions
- Backward compatibility: deprecated create_provenance and attach_provenance still work

### Expanded ToolResult (3 tests)
- All new fields default to None (SC-006)
- Full expanded result with all fields populated
- Serialization round-trip

### System Record (8 tests)
- Empty system record creation
- With snapshot links
- With branch records
- Fixture validation (empty + populated)
- Invalid feature_type rejected
- Invalid file_prov_entry type/direction rejected

### Executor Integration (5 tests)
- Provenance attached as PROV-aligned array
- Activity ID, timestamp, executionDuration present
- wasGeneratedBy.tool and toolVersion correct
- used array contains source feature IDs

### STAC Unified Provenance (6 tests)
- Basic provenance on feature (uses unified module)
- Parameters correctly structured
- Modifies in place, creates properties if missing
- ISO timestamp, multiple sources

## Success Criteria Status

| Criterion | Status | Evidence |
|-----------|--------|----------|
| SC-001: All existing tests pass | PASS | 312 calc + 6 stac = 318 pass, 0 fail |
| SC-002: Golden fixtures validate | PASS | 3 valid + 2 invalid log-entry, 2 system-record fixtures |
| SC-003: Zero `properties.prov` references | PASS | grep returns 0 matches |
| SC-004: PROV format matches SRD A.3 | PASS | Fixtures match SRD canonical examples |
| SC-005: System record validates | PASS | 2 golden fixtures pass |
| SC-006: New ToolResult fields optional | PASS | test_new_fields_default_to_none |
| SC-007: Round-trip test passes | PASS | test_log_entry_roundtrip |

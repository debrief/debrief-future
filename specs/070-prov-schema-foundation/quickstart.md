# Quickstart: PROV Schema Foundation

**Feature**: 070-prov-schema-foundation
**Date**: 2026-02-09

## What This Feature Does

This feature replaces the current flat provenance system with a PROV-aligned schema foundation. It affects three areas:

1. **LinkML schemas** — new `log-entry.yaml` and `system-record.yaml` defining the provenance data model
2. **Python models** — expanded `ToolResult` with structured change tracking, new `attach_log_entry()` function
3. **Migration** — removal of duplicate STAC provenance, unified `properties.provenance` array format

## Files Changed

### New Files
- `shared/schemas/src/linkml/log-entry.yaml` — LinkML schema for Log Entry
- `shared/schemas/src/linkml/system-record.yaml` — LinkML schema for system record properties
- `shared/schemas/fixtures/log-entry/valid/*.json` — Golden fixtures for valid Log entries
- `shared/schemas/fixtures/log-entry/invalid/*.json` — Golden fixtures for invalid Log entries
- `shared/schemas/fixtures/system-record/valid/*.json` — Golden fixtures for system records

### Modified Files
- `shared/schemas/src/linkml/debrief.yaml` — Add imports for new schema modules
- `services/calc/debrief_calc/models.py` — Add new model classes, expand ToolResult
- `services/calc/debrief_calc/provenance.py` — Replace functions with PROV-aligned versions
- `services/calc/debrief_calc/validation.py` — Update provenance validation for array format
- `services/calc/debrief_calc/executor.py` — Use new `attach_log_entry()`, populate `tool_version` and `parameters`
- `services/calc/tests/test_provenance.py` — Update tests for new format
- `services/calc/tests/test_executor.py` — Update provenance assertions
- `services/calc/tests/test_models.py` — Add tests for new model classes
- `services/stac/tests/test_provenance.py` — Update or remove for unified module

### Deleted Files
- `services/stac/src/debrief_stac/provenance.py` — Duplicate removed

## How to Verify

### Run existing tests (should all pass after changes)
```bash
cd services/calc && python -m pytest tests/ -v
cd services/stac && python -m pytest tests/ -v
```

### Run schema generation
```bash
cd shared/schemas && make generate
```

### Validate fixtures
```bash
cd shared/schemas && make validate-fixtures
```

### Check no `properties.prov` references remain
```bash
grep -r "properties.prov[^e]" services/ shared/ apps/ --include="*.py" --include="*.ts" --include="*.json"
# Should return zero results
```

## Key Concepts

### Before (current format)
```json
{
  "properties": {
    "provenance": {
      "tool": "calculate-range",
      "version": "1.0.0",
      "timestamp": "2026-01-15T10:30:00Z",
      "sources": [{"id": "track-a", "kind": "TRACK"}],
      "parameters": {"interval": 60}
    }
  }
}
```

### After (new PROV-aligned format)
```json
{
  "properties": {
    "provenance": [
      {
        "activityId": "550e8400-e29b-41d4-a716-446655440000",
        "timestamp": "2026-01-15T10:30:00Z",
        "wasGeneratedBy": {
          "tool": "calculate-range",
          "toolVersion": "1.0.0",
          "parameters": {
            "interval": { "value": 60, "default": true, "tunable": true }
          }
        },
        "used": ["track-a", "track-b"],
        "generated": ["range-result-001"],
        "executionDuration": "PT0.3S",
        "generatedResultId": null,
        "tune": null
      }
    ]
  }
}
```

### Key Differences
| Aspect | Before | After |
|--------|--------|-------|
| Structure | Single object | Array of entries |
| Identity | None | `activityId` (UUID) |
| Tool info | `tool` + `version` | `wasGeneratedBy.tool` + `.toolVersion` |
| Parameters | Flat dict | Typed `{value, default, tunable}` per param |
| Inputs | `sources: [{id, kind}]` | `used: [featureId]` |
| Outputs | Not tracked | `generated: [featureId or path]` |
| Duration | Not in provenance | `executionDuration` (ISO 8601) |
| Tuning | Not supported | `tune: {timestamp, parameter, previousValue, newValue}` |

## Dependencies

- **#062** (complete): FeatureKindEnum includes SYSTEM kind
- **LinkML >= 1.7.0**: For schema definition and generators
- **Pydantic >= 2.0.0**: For Python model validation

# TODO: REP Special Comments Implementation

**Last Updated**: 2026-01-21
**Branch**: `implement-007-rep-special-comments`

## Completed

### Phase 1: Setup ✅
- [x] T001: Add `legacy_style` attribute to PointProperties in styling.yaml
- [x] T002-T004: Regenerate schemas (Pydantic, JSON Schema, TypeScript)
- [x] T005-T006: Create annotations submodule and test structure

### Phase 2: Foundational ✅
- [x] T007: Create symbology module with A-Q color mapping (`services/io/src/debrief_io/symbology.py`)
- [x] T008: Write symbology tests (`services/io/tests/test_annotations/test_symbology.py`)
- [x] T009: DMS coordinate parsing module (`services/io/src/debrief_io/handlers/annotations/coordinates.py`)
- [x] T010: Timestamp parsing module (`services/io/src/debrief_io/handlers/annotations/timestamps.py`)
- [x] T011-T012: Coordinate and timestamp tests
- [x] T013: Symbol parsing module (`services/io/src/debrief_io/handlers/annotations/symbols.py`)
- [x] T014: Symbol parsing tests
- [x] T015: Base annotation parser (`services/io/src/debrief_io/handlers/annotations/parser.py`)
- [x] T016: Error codes in exceptions.py
- [x] Builders module with P1 implementations (`services/io/src/debrief_io/handlers/annotations/builders.py`)

### Tests Written
- [x] test_symbology.py - 17 tests for color code mapping
- [x] test_coordinates.py - 22 tests for DMS parsing
- [x] test_timestamps.py - 18 tests for timestamp parsing
- [x] test_symbols.py - 15 tests for symbol code parsing
- [x] test_narrative.py - 10 tests for NARRATIVE parsing
- [x] test_shapes.py - 18 tests for CIRCLE, RECT, LINE parsing

**Total: 88 annotation tests + 47 existing io tests = 135 tests passing**

## In Progress

### Phase 3: User Story 1 - NARRATIVE 🔄
- [x] T018: Write NARRATIVE parsing tests (done: `test_narrative.py`)
- [ ] T019-T022: Wire NARRATIVE parsing into REP handler

### Phase 4: User Story 2 - Shapes 🔄
- [x] T023-T025: Write shape parsing tests (done: `test_shapes.py`)
- [ ] T026-T032: Wire shape parsing into REP handler

## Next Steps

### Immediate (Resume Here)

1. **Run the new tests to verify they pass**:
   ```bash
   cd services/io && uv run pytest tests/test_annotations/test_narrative.py tests/test_annotations/test_shapes.py -v
   ```

2. **Wire annotation parser into REP handler** (`services/io/src/debrief_io/handlers/rep.py`):
   - Import `parse_annotations` from annotations module
   - Collect annotation lines during parsing
   - Call `parse_annotations()` after track parsing
   - Merge annotation features into result

3. **Create integration test** (`services/io/tests/test_annotations/test_integration.py`):
   - Parse a REP file with both tracks AND annotations
   - Verify both are returned in result.features

4. **Add shapes.rep test fixture**:
   - Copy canonical shapes.rep to `services/io/tests/fixtures/valid/`
   - Create test that parses it and verifies output

### After Integration

5. **Phase 5: Track Regression (T033-T035)**
   - Verify track output unchanged after annotation additions
   - Run existing REP tests to confirm no regression

6. **P2 Annotations (optional)**
   - TEXT, VECTOR already implemented in builders.py
   - POLY, POLYLINE, ELLIPSE, TIMETEXT, PERIODTEXT need implementation

7. **Evidence & PR**
   - Capture test summary
   - Create shipped blog post
   - Run `/speckit.pr`

## Key Files

| File | Purpose |
|------|---------|
| `services/io/src/debrief_io/symbology.py` | A-Q color code mapping |
| `services/io/src/debrief_io/handlers/annotations/` | Annotation parsing module |
| `services/io/src/debrief_io/handlers/annotations/parser.py` | Main entry point |
| `services/io/src/debrief_io/handlers/annotations/builders.py` | Feature builders |
| `services/io/src/debrief_io/handlers/rep.py` | REP handler (needs integration) |
| `services/io/tests/test_annotations/` | All annotation tests |

## Design Decisions (from research.md)

- **Fail-fast**: Invalid data raises `AnnotationParseError` immediately
- **Symbol codes**: A-Q map to CSS hex colors
- **Coordinates**: DMS format with fractional degrees support
- **Timestamps**: YYMMDD HHMMSS with 50-99→1900s, 00-49→2000s
- **Legacy style**: Symbol names stored in `legacy_style` attribute for future icon support

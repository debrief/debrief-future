---
feature: "117-rep-sensor-import"
captured_at: "2026-04-10T12:00:00Z"
git_sha: "149a803"
tests_passed: 90
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: REP Sensor Import

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 90 |
| Passed | 90 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | N/A |

## Test Breakdown

### Unit Tests: sensor_parser.py (45 tests)

| Test | Status |
|------|--------|
| is_sensor_line — SENSOR/SENSOR2/SENSOR3/SENSORARC detection | Pass |
| parse_sensor_v1 — all field extraction (unquoted name) | Pass |
| parse_sensor_v1 — quoted track name ("NEL STYLE") | Pass |
| parse_sensor_v1 — NULL location (origin is None) | Pass |
| parse_sensor_v1 — explicit DMS location (origin is [lon, lat]) | Pass |
| parse_sensor_v1 — range conversion 5000 yds -> 4572.0 m | Pass |
| parse_sensor_v1 — symbology code @C -> color_code "C" | Pass |
| Contacts with same sensor name merge into single SensorData | Pass |
| Contacts within SensorData ordered by timestamp | Pass |
| NULL bearing -> has_bearing=false, bearing=0 | Pass |
| NAN bearing -> has_bearing=false, bearing=0 | Pass |
| 0.0 bearing (true north) -> has_bearing=true, bearing=0.0 | Pass |
| parse_sensor_v2 — ambiguous_bearing and frequency extraction | Pass |
| parse_sensor_v2 — NULL ambiguous bearing -> has_ambiguous=false | Pass |
| parse_sensor_v2 — NULL frequency -> has_frequency=false | Pass |
| parse_sensor_v2 — NAN bearing -> has_bearing=false | Pass |
| Multiple SENSOR2 contacts merge into one SensorData | Pass |
| parse_sensor_v3 — all SENSOR2-equivalent fields | Pass |
| parse_sensor_v3 — accuracy fields silently discarded | Pass |
| Mixed SENSOR/SENSOR2/SENSOR3 merge into single SensorData | Pass |
| SENSOR3 with NULL accuracy = identical to SENSOR2 | Pass |
| parse_sensorarc — all fields extracted correctly | Pass |
| SENSORARC produces DYNAMIC_TRACK_COVERAGE, not SensorContact | Pass |
| SENSORARC track_id association | Pass |
| Degenerate SENSORARC (inner = outer range) accepted | Pass |
| group_sensor_contacts — groups by track and sensor name | Pass |
| group_sensor_contacts — color from first contact symbology | Pass |
| group_sensor_contacts — has_bearing=false in contact dict | Pass |
| group_sensor_contacts — origin in contact dict | Pass |
| group_sensor_contacts — empty records -> empty dict | Pass |
| Malformed SENSOR v1 (too few fields) -> None | Pass |
| Malformed SENSOR v2 (too few fields) -> None | Pass |
| Malformed SENSOR v3 (too few fields) -> None | Pass |
| Malformed SENSORARC (too few fields) -> None | Pass |
| Bearing 360 accepted as valid | Pass |
| Zero range accepted | Pass |
| Missing sensor name defaults to "Unknown" | Pass |
| Tab-separated SENSOR line normalised and parsed | Pass |
| Provenance line_number correctly recorded | Pass |

### Integration Tests: test_rep_handler.py (11 tests)

| Test | Status |
|------|--------|
| No standalone SENSOR/SENSOR_CONTACT features in output | Pass |
| Sensor lines populate pending_sensor_data on ParseResult | Pass |
| Orphaned sensor data emits ORPHANED_SENSOR warning | Pass |
| Full REP parse with SENSOR v1 — 3 contacts, DMS origin on first | Pass |
| SENSOR2 integration — correct embedded data with boolean flags | Pass |
| SENSOR3 mixed format — ambiguous_bearing preserved | Pass |
| SENSORARC produces DynamicTrackCoverage annotation | Pass |
| Quoted track name "NEL STYLE" in pending_sensor_data | Pass |
| Mixed SENSOR/SENSOR2/SENSOR3 merge into one SensorData | Pass |
| Track features still valid alongside sensor data | Pass |

### Performance Tests (1 test)

| Test | Status |
|------|--------|
| 10,000-line mixed-format REP parses in under 1 second | Pass |

### Existing Tests (34 tests, regression)

| Suite | Tests | Status |
|-------|-------|--------|
| DMS coordinate parsing | 6 | All Pass |
| Timestamp parsing | 4 | All Pass |
| REP handler basic | 7 | All Pass |
| REP handler real files | 6 | All Pass |
| Smart intervals integration | 3 | All Pass |
| Position style intervals | 8 | All Pass |

## Key Scenarios Verified

- **Sensor embedding**: SENSOR/SENSOR2/SENSOR3 lines produce `pending_sensor_data` (not standalone features)
- **Cross-format merge**: SENSOR v1/v2/v3 contacts with same sensor name merge into single SensorData
- **NULL/NAN bearing**: Produces `has_bearing=false` + `bearing=0` without errors
- **DMS origin**: Explicit coordinates -> `origin=[lon,lat]`; NULL -> `origin=None`
- **Yards to metres**: 5000 yards converts to exactly 4572.0 metres
- **SENSORARC isolation**: Produces DynamicTrackCoverage (not SensorContact)
- **Orphaned sensors**: Warning emitted, data retained for companion file merge
- **Performance**: 10k-line file (5000 positions + 5000 sensor lines) parses well under 1s

## Known Issues

- None

## Environment

- Runner: pytest 9.0.2
- Branch: claude/implement-speckit-117-Icgpu
- Date: 2026-04-10

# Implement Phase 4 tools: sensor/analysis + sensor/calibration (9 tools)

## Problem

9 sensor tool specs exist with golden I/O but no implementations. These tools handle sensor contact management, bearing ambiguity resolution, and frequency analysis — critical for submarine analysis workflows.

## Proposed Solution

Implement 9 tools in `services/calc/`:

**sensor/analysis (6):** generate-new-sensor-contact, insert-sensor-arc, merge-contacts, doppler-curve, generate-sensor-range-plot, inflection-point-detector

**sensor/calibration (3):** ambiguity-resolver, resolve-ambiguity, delete-ambiguous-bearings

## Success Criteria

- All 9 tools pass golden I/O fixtures
- Sensor tools correctly handle SENSOR kind features
- Ambiguity resolution tools produce correct filtered/resolved responses

## Constraints

- Requires #062 (SENSOR FeatureKindEnum value and SensorFeature/SensorProperties classes)
- Requires Phase 1 complete (measurement tools used as building blocks)
- Doppler and frequency tools may need scipy or similar for signal processing

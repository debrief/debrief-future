## What We're Building

The REP file format has four flavours of sensor line -- `;SENSOR:`, `;SENSOR2:`, `;SENSOR3:`, and `;SENSORARC` -- each carrying bearing, range, and frequency observations that legacy Debrief associates with host tracks. Right now our REP parser treats these as standalone annotation features, which means they float in the output disconnected from the tracks they belong to. That's wrong, and it's blocking the rest of the sensor pipeline.

This feature rewires the parser so sensor contacts are embedded directly in `TrackFeature.properties.sensors[]`, grouped by sensor name. A track with a towed array and a hull sonar ends up with two sensor entries, each containing a time-ordered list of contacts. SENSORARC lines (coverage zones, not point observations) stay as standalone annotation features -- they're a different kind of data.

## How It Fits

This is Phase 2 of the [E07 Sensor Data Pipeline](https://github.com/debrief/debrief-future/blob/main/docs/ideas/E07-sensor-data-pipeline.md). Phase 1 (#116) defines the SensorContact/SensorData schema. This feature populates that schema from the most common input format. Phase 3 (#118) will render the parsed data as bearing lines on the map.

The pattern already exists -- our DSF handler uses `pending_sensor_data` to hand off sensor contacts to the import pipeline, which merges them into companion track features. We're applying the same pattern inside the REP handler itself, since REP files interleave track positions and sensor contacts in a single file.

## Key Decisions

- **New `sensor_parser.py` module** rather than inlining ~400 lines of parsing code in `rep.py`. Four format variants with different field layouts deserve their own home.
- **Yards to metres at parse time**, not render time. The schema uses metres, and converting early keeps everything consistent with DSF-imported data.
- **NULL/NAN bearings produce contacts with `has_bearing=false`**. These are frequency-only observations (passive sonar with no bearing fix), and they're common in real datasets. The bearing field is set to 0 as a sentinel.
- **SENSOR3 accuracy fields are parsed and discarded**. Legacy Debrief had a TODO for these. We're matching that behaviour -- parse past them so the rest of the line works, but don't store values nobody consumes yet.
- **Orphaned sensor data is kept, not discarded**. If a sensor line references a track not in the file, the data stays in `pending_sensor_data` with a warning. The import pipeline might find the track in a companion file.

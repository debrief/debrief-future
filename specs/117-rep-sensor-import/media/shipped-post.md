---
layout: future-post
title: "Shipped: REP Sensor Import"
date: 2026-04-10
track: [credibility]
author: Ian
reading_time: 4
tags: [sensor-data, rep-parser, debrief-io, e07-sensor-pipeline]
excerpt: "SENSOR v1/v2/v3 and SENSORARC lines now parse correctly from REP files, embedding contacts directly into track features"
---

## What We Built

The REP file format carries four flavours of sensor line — `;SENSOR:`, `;SENSOR2:`, `;SENSOR3:`, and `;SENSORARC` — and our parser used to treat all of them as floating annotation features, disconnected from the tracks they belong to. That's now fixed.

Sensor contacts are embedded in `TrackFeature.properties.sensors[]` via a new `pending_sensor_data` mechanism, grouped by sensor name. A track with both a towed array and a hull sonar produces two sensor entries, each with a time-ordered list of contacts. SENSORARC lines (coverage zones, not point observations) become standalone `DynamicTrackCoverage` features — they're a different kind of data and belong in a different place.

The parsing lives in a new `sensor_parser.py` module. The REP handler intercepts sensor lines before the annotation parser runs, routes them through `sensor_parser`, and accumulates the results in `ParseResult.pending_sensor_data`. The import pipeline picks that up and merges it into the companion track features, exactly as it already does for DSF-imported data.

## How to Use It

```python
from debrief_io.handlers.rep import REPHandler

handler = REPHandler()
result = handler.parse(content, "exercise.rep")

# Sensor data lives here — not in result.features
sensors = result.pending_sensor_data["NELSON"]
for sensor in sensors:
    print(f"{sensor['name']}: {len(sensor['contacts'])} contacts")

# SENSORARC produces DynamicTrackCoverage annotations
coverage = [f for f in result.features
            if f["properties"]["kind"] == "DYNAMIC_TRACK_COVERAGE"]
```

No standalone `SENSOR` or `SENSOR_CONTACT` features are produced. If a sensor line references a track not found in the file, the data is kept in `pending_sensor_data` with a warning — the import pipeline may find the track in a companion file.

Here's what the parser actually produces for a track with three SENSOR v1 contacts — one with explicit DMS coordinates, two with NULL location:

```json
{
  "NELSON": [
    {
      "name": "TOWED_ARRAY",
      "contacts": [
        {
          "time": "1995-12-12T05:00:00+00:00",
          "bearing": 45.0,
          "range": 4572.0,
          "origin": [-21.698, 22.186],
          "label": "contact_1"
        },
        {
          "time": "1995-12-12T05:01:00+00:00",
          "bearing": 50.0,
          "range": 5029.2,
          "label": "contact_2"
        },
        {
          "time": "1995-12-12T05:02:00+00:00",
          "bearing": 55.0,
          "range": 5486.4,
          "label": "contact_3"
        }
      ],
      "color": "#FF0000"
    }
  ]
}
```

The first contact has an `origin` from explicit DMS coordinates in the REP line. The other two have no origin — their position will be derived from the host track at render time. Range values are already converted from yards to metres.

## By the Numbers

| | |
|---|---|
| Tests passing | 90 |
| Tests failed | 0 |
| Unit tests (sensor_parser.py) | 45 |
| Integration tests | 11 |
| Regression tests (existing suites) | 34 |
| Performance test | 1 |
| 10k-line REP parse time | < 1 second |

## Lessons Learned

**NULL and NAN bearings are not the same edge case.** REP files use both as sentinels for "no bearing fix", typically from passive sonar picking up frequency but not direction. The parser handles both and sets `has_bearing=false` with `bearing=0` as a typed sentinel — so downstream consumers can branch on presence without checking for string values.

**SENSOR3 accuracy fields were a decision, not a gap.** The spec includes accuracy fields that legacy Debrief marked with a `TODO`. We parse past them so the rest of the line works, but don't store values nothing consumes yet. That decision is recorded; when something does need them, they're easy to surface.

**The DMS origin question from the planning post resolved cleanly.** Sensor lines can carry an explicit DMS location for the sensor origin (useful for fixed installations or when the host position is unreliable). The parser extracts it when present and sets `origin=None` otherwise. No ambiguity in practice — the field is either `NULL` or a coordinate pair.

**Regression coverage was the real confidence source.** The 34 existing tests covering DMS parsing, timestamp handling, and base REP behaviour all passed unchanged. That made it straightforward to verify the new sensor path didn't disturb anything already working.

## What's Next

Phase 3 (#118) takes this data and renders it: bearing lines on the map, drawn from the sensor origin at the recorded bearing. The `pending_sensor_data` structure was designed with that in mind — range, bearing, ambiguous bearing, and frequency are all available when the renderer needs them.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/117-rep-sensor-import/spec.md)
→ [E07 Sensor Data Pipeline](https://github.com/debrief/debrief-future/blob/main/docs/ideas/E07-sensor-data-pipeline.md)

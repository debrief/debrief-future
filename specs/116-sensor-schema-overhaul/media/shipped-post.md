---
layout: future-post
title: "Shipped: Sensor Schema Overhaul"
date: 2026-04-10
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, schemas, sensor-data, shipped]
excerpt: "Full SensorContact/SensorData redesign complete — 4 enums, 15 new fields, 62 fixture updates, 1533 tests passing"
---

## What We Shipped

The sensor schema overhaul is complete. This is Phase 1 of the E07 Sensor Data Pipeline epic, and it lays the foundation for everything that follows: sensor import, rendering, array offset calculations, and eventually TMA.

### By the Numbers

- **4 new enumerations**: ArrayCentreModeEnum, LineStyleEnum, LabelLocationEnum, LineLabelPositionEnum
- **1 new class**: MeasuredArrayPosition (timestamped coordinate pair for towed array positions)
- **10 new SensorContact fields**: boolean presence flags (has_bearing, has_ambiguous, has_frequency), display properties (color, visible, show_label, line_style, label_location, put_label_at), and an explicit origin coordinate override
- **5 new SensorData fields**: array_centre_mode, color, visible, line_thickness, measured_positions
- **10 new golden fixtures**: 4 valid (comprehensive, minimal, measured, boundary), 6 invalid (enum validation, origin cardinality, bearing range)
- **60 tool fixture files updated** across 9 sensor tools
- **1533 tests passing** (1522 Python + 11 TypeScript), 0 failures

### What Changed

All changes flow from LinkML master schemas through the generation pipeline to Pydantic models, JSON Schema, and TypeScript interfaces. No hand-edited generated code. No breaking changes — every new field is optional, and existing fixtures validate unchanged.

The core additions fall into three categories:

**Boolean presence flags** (`has_bearing`, `has_ambiguous`, `has_frequency`) follow a legacy pattern where the flag controls display, not data presence. A contact with `has_bearing=false` and `bearing=045.0` is valid — the bearing is stored but not drawn. This pattern exists because legacy Debrief stores raw sensor values unconditionally.

**Display properties** (color, line_style, label placement, visibility) enable sensors to persist visual customizations across save/load cycles. Contact color follows an inheritance pattern: if null, it inherits from the parent SensorData.

**Array centre modes** (PLAIN, WORM, MEASURED) determine how bearing line origins are calculated. The MEASURED mode uses a new `measured_positions` array of timestamped coordinate pairs recording actual towed array locations.

### Test Coverage

The test suite covers schema correctness from multiple angles:

- **Golden fixtures**: 88 fixtures (52 valid, 36 invalid) auto-discovered and validated
- **Round-trip tests**: Python-JSON-Python for all fixtures; JSON-TypeScript-JSON via vitest
- **Schema comparison**: JSON Schema structure verified for SensorData, SensorContact, MeasuredArrayPosition, and all 4 new enums
- **Enum exhaustiveness**: Every permissible value of every new enum is parametrically tested
- **Tool fixture validation**: All 62 sensor tool fixtures validated for structural correctness
- **Constraint edge cases**: bearing=0 and bearing=360 accepted; bearing=-1 and bearing=361 rejected; origin cardinality enforced

### What This Enables

With the schema in place, downstream phases can proceed:

- **#117 REP Sensor Import**: Parser knows what fields to populate
- **#118 Sensor Rendering**: Leaflet layer knows what display properties to read
- **#119 Array Offset Calculations**: Schema captures the mode and measured positions
- **#179 Sensor-aware Layers Panel**: Already shipped, now has richer data to display

The schema is the single source of truth for the entire sensor pipeline. Getting it right here means less rework in every subsequent phase.

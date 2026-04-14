---
layout: post
title: "Shipped: Array Offset Calculations for Towed-Array Sensors"
date: 2026-04-14
track: [credibility]
author: Ian
reading_time: 3
tags: [tracer-bullet, sensor-pipeline, towed-array, e07]
excerpt: "Three modes for calculating where a towed array actually is behind the vessel — PLAIN, WORM, MEASURED — shipping with bit-identical TypeScript and Python implementations."
categories: [shipped]
---

## What We Built

When a warship tows a sonar array, the sensor isn't where the vessel is — it's hundreds of metres back, trailing through the water on a cable. Draw a bearing line from the vessel and you've anchored the geometry of the whole tactical picture to the wrong point. Feature 119 fixes that.

Every sensor bearing line now originates from the *calculated* array centre, chosen by one of three modes on the sensor record:

- **PLAIN** backtracks from the vessel's interpolated position along its course at the contact time by the offset distance. Simple, reliable, the fallback everything else collapses to.
- **WORM** ("worm in hole") walks backward along the vessel's actual track geometry, accumulating geodesic distance segment by segment until it reaches the offset. The array follows the path the ship took — it doesn't snap to the new heading when the ship turns.
- **MEASURED** interpolates between real measured array positions when the sensor has instrumented position data; falls back to PLAIN when the contact timestamp falls outside the measured range.

The calculation is wired directly into `prepareSensorContacts()`, so the moment a sensor declares `offset` and `array_centre_mode`, bearing lines render from the correct origin. No downstream rendering changes were needed — the integration is one function call per contact.

## What It Looks Like

Three panels, same track, same sensor cuts, one minute after a 90° starboard turn:

![PLAIN vs WORM vs MEASURED comparison](../evidence/plot-comparison.svg)

Contact 1 (just after the turn) is where the modes diverge most. PLAIN plants the array centre 1.5 km straight west of the ship, because the ship is heading east. WORM correctly drops it 1.5 km *south* — on the northbound leg the ship just left — because the cable is still dragging the array through the turn. MEASURED uses the instrumented positions (the little squares); the fifth contact falls outside the measured time range and transparently falls back to PLAIN.

By contact 5 (thirteen minutes later) the ship has been on a straight course long enough for the array to settle, and PLAIN/WORM converge to the same origin.

Every coordinate on that plot is generated from the actual `compute_array_centre` dispatcher — `scripts/119-render-comparison-plots.py` imports the module and projects its outputs directly into SVG. There's no mock, no hand-drawn illustration; the plot regenerates from the current algorithm on demand.

## How It Works

Three pure functions (`computePlainOffset`, `backtrackAlongTrack`, `interpolateMeasuredPosition`) plus a one-line dispatcher. Each has a bit-identical twin in Python under `services/calc/debrief_calc/tools/sensor/array_offset.py`, because the calc tools that generate range plots and insert sensor arcs need the same array centres the browser draws.

To keep TypeScript and Python honest we share a JSON golden fixture — seven contract cases covering every mode plus the zero-offset shortcut and the MEASURED → PLAIN fallback. Both languages load the same fixture and run the same assertion: the haversine distance from the computed origin to `expected_origin` must land inside `tolerance_metres`. On this branch every case agrees to *zero metres* — the IEEE-754 doubles converge exactly because the formulas are identical.

One deliberate simplicity: no caching. `prepareSensorContacts()` is stateless and React re-renders with fresh props whenever an analyst changes mode or offset. Benchmarks confirm the assumption holds: 1000 contacts recompute in 83 ms in TypeScript WORM mode and 208 ms in Python — both well under the 1-second budget set by SC-004.

## By the Numbers

| | |
|---|---|
| New tests | 87 (39 TS unit + 32 Python unit + 8 parity + 5 integration + 3 existing-coverage updates) |
| Total tests passing | 1,389 |
| Tests failed | 0 |
| Golden-parity cases | 7 / 7 at **0.000 m** delta between languages |
| WORM 1000-contact benchmark | 83 ms (TS) / 208 ms (Py) vs 1000 ms budget |
| New external dependencies | 0 (stdlib math only) |
| Schema changes | 0 (consumes existing `SensorData.offset`, `.array_centre_mode`, `.measured_positions`) |

## What's Next

With the array centre calculation in place, Epic E07 Phase 4 is complete. Phase 5 (#120 — bearing and frequency residual analysis) is deferred pending executive sponsorship, which means the next active piece of the sensor pipeline is TMA data modelling (#121) — also deferred. For the immediate future, the sensor pipeline has everything it needs: contacts render from the correct origins, and the infrastructure is ready for residual analysis when it unblocks.

→ [Spec and evidence](https://github.com/debrief/debrief-future/tree/claude/implement-backlog-119-uSlQ7/specs/119-array-offset-calc)

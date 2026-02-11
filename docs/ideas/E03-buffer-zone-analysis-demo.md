# Epic: Buffer Zone Analysis Demo

Reactive PROV cascade with 5-tool chain for stakeholder demonstration.

## Problem

We need a compelling stakeholder demo scenario that shows the reactive PROV system working end-to-end. The demo must visually demonstrate how editing one operation cascades changes through downstream operations — all tracked in provenance.

## Proposed Solution

Build a 5-step operation chain where moving a track causes buffer zones, point classifications, and a histogram to update automatically:

1. **Generate Reference Points** — tool creates a grid/scatter of generated points on the plot
2. **Move Track** — user offsets a track by range/bearing (editable in PROV log + draggable on map when in edit mode)
3. **Buffer Zones from Sensor Model** — stub sensor model returns 3 detection-likelihood distances, rendered as buffer polygons around the moved track
4. **Classify Reference Points** — points recolored based on which buffer zone they fall in (or none)
5. **Histogram** — bar chart of point counts per zone, stored as STAC artifact, auto-refreshes when the open view detects upstream changes

### Key Behaviors

- Editing step 2 (move track) causes steps 3-5 to cascade automatically via PROV dependency graph
- PROV log entries become editable controls: clicking "edit" on the move-track entry unlocks range/bearing fields AND makes the track draggable on the map
- Buffer distances come from a stub sensor model with the right interface shape (swappable for real models later)
- The histogram result is persisted in STAC; open result views auto-refresh while preserving viewport
- Both drag (fluid exploration) and range/bearing input (precision) supported for track movement

## Success Criteria

- [ ] All 5 tools implemented and individually testable
- [ ] Moving the track causes buffer zones, point colors, and histogram to update automatically
- [ ] PROV log shows the full dependency chain with correct lineage
- [ ] Edit mode on PROV entry unlocks both range/bearing fields and map drag interaction
- [ ] Histogram auto-refreshes when open, preserving viewport state
- [ ] Stub sensor model has clean interface that can be swapped for real model later
- [ ] Entire chain works offline (CONSTITUTION requirement)

## Constraints

- Sensor model is a stub returning 3 hardcoded distances — must have clean interface for future real model
- Reference points are generated (not imported from external data)
- Depends on E02 PROV logging infrastructure (especially #076 replay-tune for reactive cascade)
- All tools follow the tool documentation model (#049)

## Out of Scope

- Real sensor/propagation models (stub only for demo)
- Importing reference points from external datasets
- 3D buffer zones (2D only)
- Performance optimization for very large point sets

## Cross-Epic Dependencies

Most E03 items (#078-081) can proceed independently of E04 (Results Visualization). Only the histogram and demo integration need E04:

- **#082** (histogram tool) outputs a standard `dataset/zone_histogram` using the existing result type schema — NO dependency on E04. The E04 transformer converts datasets to Vega-Lite specs for rendering.
- **#084** (end-to-end demo) needs E04 #086 (results panel) + #089 (auto-refresh) for viewable, refreshing results
- **#078-082** have NO dependency on E04 — pure geometry/data operations using existing schemas

E03 #083 was absorbed into E04 #089 (result view auto-refresh).

## Epic Breakdown

| Item | Description | Dependencies |
|------|-------------|--------------|
| 078 | Generate reference points tool | #049 |
| 079 | Move track by range/bearing offset tool | #049, #062 |
| 080 | Stub sensor model + buffer zone generator tool | #049, #079 |
| 081 | Point-in-zone classifier tool (with coloring) | #049, #078, #080 |
| 082 | Zone histogram generator tool (dataset/zone_histogram output) | #049, #081 |
| 084 | Wire buffer zone analysis demo end-to-end | #076, #078-082, E04 #086, E04 #089 |

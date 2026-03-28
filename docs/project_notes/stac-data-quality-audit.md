# STAC Data Quality Audit

**Date:** 2026-03-28
**Catalog:** `preview/workspace/samples/local-store/` (123 plots)
**Import date:** 2026-03-21

## Issue 1: March 2026 Fallback Timestamps

24 plots have `datetime` set to the import timestamp (2026-03-21T10:15:xx) instead of
real data dates. All have `start_datetime: null` and `end_datetime: null`.

**Root cause:** `update_temporal_metadata()` in `services/stac/src/debrief_stac/plot.py:184-198`
only examines `TRACK` features for timestamps. Sensor contacts, narratives, and shapes
all have `time` properties but are ignored. When no TRACKs are present, the function
returns `None` and the plot keeps its creation timestamp.

### Affected Plots (24)

| Plot ID | Feature Types | Count |
|---------|--------------|-------|
| core--narrative | NARRATIVE | 19 |
| core--narrative2 | NARRATIVE | 20 |
| core--narrative-bulk | NARRATIVE | 12150 |
| core--narrative-large | NARRATIVE | 4795 |
| core--sen-frig-sensor | SENSOR_CONTACT | 95 |
| core--sen-missing-host-sensor | SENSOR_CONTACT | 95 |
| core--sen-ssk-freq | SENSOR_CONTACT | 8 |
| core--sen-ssk-sensor | SENSOR_CONTACT | 15 |
| demo-analysis--analysis1-areas | RECTANGLE | 3 |
| demo-analysis--analysis4-narrative | NARRATIVE | 21 |
| demo-review--review2-sensor1 | SENSOR_CONTACT | 95 |
| demo-review--review3-sensor2 | SENSOR_CONTACT | 15 |
| demo-trialsplanning--trialsplanning3-hits | PERIODTEXT | 3 |
| other-formats-ta-dummy-data--freq-bluesensor | SENSOR_CONTACT | 226 |
| other-formats-ta-dummy-data--freq-bluesensor-nopos | SENSOR_CONTACT | 226 |
| s2r--ambig-tracks-hover-north-hm | SENSOR_CONTACT | 121 |
| s2r--ambig-tracks-hover-north-ta | SENSOR_CONTACT | 121 |
| s2r--sensor | SENSOR_CONTACT | 52 |
| s2r-2553-missing-sensor-data--bluesensorbrg | SENSOR_CONTACT | 145 |
| s2r-freq--contact-bearings | SENSOR_CONTACT | 53 |
| satc--b-rate-sensor | SENSOR_CONTACT | 218 |
| satc--bluesensor | SENSOR_CONTACT | 241 |
| satc--bluesensor-sparse | SENSOR | 38 |
| satc--l1-ownshipsensor | SENSOR_CONTACT | 11 |

**Fix:** Expand `update_temporal_metadata()` to also scan sensor contacts (via `time`
property) and narratives (via `time` property) when computing temporal extent.

---

## Issue 2: Sensor-Only Plots (Orphaned Sensor Data)

17 plots contain only sensor contact data with no accompanying track data.
In legacy Debrief, sensor files (.dsf) were always loaded alongside their
companion track files (.rep) in the same plot. The current importer creates
one STAC plot per source file, losing the track-sensor relationship.

### Sensor -> Track Plot Mapping

Each sensor contact has a `parent_track` property naming its host platform.
Track features use `platform_id`. Matching by these values + domain naming:

| Sensor-Only Plot | parent_track | Best Track Match |
|-----------------|-------------|-----------------|
| core--sen-frig-sensor | Frigate | core--sen-tracks |
| core--sen-missing-host-sensor | Frigate, NONSUCH | core--sen-tracks (Frigate only; NONSUCH missing) |
| core--sen-ssk-freq | New_SSK | core--sen-tracks |
| core--sen-ssk-sensor | New_SSK | core--sen-tracks |
| demo-review--review2-sensor1 | Frigate | demo-review--review1-tracks |
| demo-review--review3-sensor2 | New_SSK | demo-review--review1-tracks |
| other-formats-ta-dummy-data--freq-bluesensor | SENSOR | other-formats-ta-dummy-data--freq-bluetrack |
| other-formats-ta-dummy-data--freq-bluesensor-nopos | SENSOR | other-formats-ta-dummy-data--freq-bluetrack |
| s2r-2553-missing-sensor-data--bluesensorbrg | SENSOR | s2r-2553-missing-sensor-data--bluetrack |
| s2r--ambig-tracks-hover-north-hm | SENSOR | s2r--ambig-tracks-hover-north |
| s2r--ambig-tracks-hover-north-ta | SENSOR | s2r--ambig-tracks-hover-north |
| s2r-freq--contact-bearings | NONSUCH | s2r-freq--osshipaa-3 |
| s2r--sensor | NONSUCH | s2r--nonsuch |
| satc--b-rate-sensor | OWNSHIP | satc--b-rate-ownship |
| satc--bluesensor | SENSOR | satc--bluetrack |
| satc--bluesensor-sparse | (none) | NO MATCH (keep standalone) |
| satc--l1-ownshipsensor | OWNSHIP | satc--l1-ownshiptrack |

**Fix:** Merge sensor features from sensor-only plots into their matching
track plots, copy the source asset, then remove the sensor-only plot.

---

## Date Distribution (All 123 Plots)

| Era | Count | Notes |
|-----|-------|-------|
| 1900 | 1 | satc--b-rate-ownship (valid legacy date) |
| 1970 | 5 | Epoch-ish dates (likely valid REP data) |
| 1995 | 17 | Dec 12 1995 — core sample data era |
| 1999-2000 | 7 | SATC test scenarios |
| 2009 | 14 | S2R + SATC scenarios |
| 2010 | 32 | Multi-static, S2R, SATC (Jan 12 2010) |
| 2011 | 2 | SATC other-ownship |
| 2014 | 1 | Multi-static buoyfield |
| 2016 | 2 | SATC datasets |
| 2017 | 1 | S2R polyline measurement |
| **2026-03-21** | **24** | **Import timestamp fallback** |

After fixing the 24 fallback-dated plots, the timeline distribution will be
realistic and representative, with data spread across 1970-2017.

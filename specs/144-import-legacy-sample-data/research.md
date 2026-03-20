# Research: Import Legacy Sample Data

**Feature**: 144-import-legacy-sample-data
**Date**: 2026-03-20

## R1: DPF (Debrief Plot File) XML Format

### Decision

Parse DPF files using Python's `xml.etree.ElementTree` with namespace-aware parsing. Extract tracks, sensor contacts, and narratives; ignore UI state (styling, visibility, projections).

### Rationale

- DPF is a well-structured XML format with namespace `http://www.debrief.info/plot`
- ElementTree is in the Python standard library (no new dependencies per Constitution Art. IX)
- The format is consistent across the 46 sample files (all produced by legacy Debrief)
- Only spatial/temporal data matters for the STAC catalog; UI state is out of scope

### Format Specification (from sample file analysis)

**Root element**: `<plot xmlns="http://www.debrief.info/plot" Created="..." Name="..." PlotId="...">`

**Track structure**:
```xml
<track Name="NELSON" Symbol="ScaledSubmarine" ...>
  <TrackSegment Name="Positions" PlotRelative="false">
    <fix Course="269.700" Dtg="951212 050000" Speed="2.000" ...>
      <centre>
        <shortLocation Depth="0.000" Lat="22.1862861" Long="-21.6978806"/>
      </centre>
    </fix>
    <!-- more fixes -->
  </TrackSegment>
</track>
```

Key observations:
- Coordinates stored as **decimal degrees** (Lat/Long attributes on `<shortLocation>`)
- Timestamps stored as `YYMMDD HHMMSS[.SSS]` in `Dtg` attribute (same format as REP)
- Course in degrees (0-360), Speed in knots, Depth in metres
- Track name in `Name` attribute
- Each track contains one or more `<TrackSegment>` elements

**Sensor structure**:
```xml
<sensor Name="sensor 3:90" TrackName="OSPREY" ...>
  <sensor_contact Bearing="32.757" Dtg="951212 054902.486"
    AmbiguousBearing="0.000" HasAmbiguousBearing="false"
    Frequency="0.000" HasFrequency="false"
    Label="some label:" .../>
  <!-- more contacts -->
</sensor>
```

Key observations:
- Sensors are children of `<track>` elements
- Each `<sensor>` has a Name and parent TrackName
- `<sensor_contact>` has Bearing (degrees), optional AmbiguousBearing, optional Frequency
- No explicit location on contacts — derived from parent track position at contact time
- Dtg format same as track fixes

**Narrative structure**:
```xml
<narrative Name="Narratives">
  <narrative_entry Dtg="951212 050000" Entry="comment text" Track="CARPET" Type="Narratives"/>
</narrative>
```

**Shape elements** (in `<layer>` elements):
- `<line>`, `<rectangle>`, `<circle>`, `<textlabel>` with `<shortLocation>` children
- These map to GeoJSON Point/LineString/Polygon features

### Alternatives Considered

| Alternative | Rejected Because |
|------------|-----------------|
| lxml (external dependency) | Constitution Art. IX — prefer stdlib; no XPath needed |
| SAX parser | More complex for the small file sizes involved (~14.5 MB total) |
| Parse full UI state | Out of scope — only spatial/temporal data needed |
| Custom string parsing | XML structure is well-formed; stdlib parser is reliable |

---

## R2: DSF (Debrief Sensor File) Format

### Decision

Implement DSF handler by reusing existing REP sensor line parsing logic. DSF files contain only `;SENSOR:` lines with no track position data.

### Rationale

- DSF files are identical in format to REP sensor comment lines
- Sample DSF file `sen_frig_sensor.dsf` confirms format: `;SENSOR: YYMMDD HHMMSS.SSS TrackName @Symbol NULL Bearing Range SensorName Label`
- The "NULL" in the location field means contacts derive position from the host track
- Reusing REP sensor parsing avoids code duplication

### Format Specification

```
;SENSOR: YYMMDD HHMMSS.SSS TrackName @Symbol [Lat|NULL] Bearing Range SensorName Label
```

Fields:
- Timestamp: YYMMDD HHMMSS.SSS
- TrackName: Host track identifier (unquoted)
- Symbol: Display symbol (e.g., @A)
- Location: DMS coordinates or NULL (position derived from host track)
- Bearing: Degrees (can be negative for reciprocal bearings)
- Range: Yards
- SensorName: Sensor system identifier
- Label: Free-text description

### Alternatives Considered

| Alternative | Rejected Because |
|------------|-----------------|
| Full independent parser | Unnecessary duplication — format identical to REP sensor lines |
| Parse as REP files | DSF files have no track positions; REP parser expects position records |

---

## R3: Batch Import Pipeline Architecture

### Decision

Implement a standalone `import_catalog.py` script in `services/io/` that orchestrates: clone/download legacy files → parse each file → create STAC catalog with one plot per file → generate summary report. Use existing STAC service functions sequentially (not batched).

### Rationale

- This is a one-time batch operation, not a recurring service
- Sequential processing is simpler and sufficient for ~148 files
- Existing STAC service APIs (`create_catalog`, `create_plot`, `add_features`, `add_asset`) are well-tested
- Performance goal (under 5 minutes) is achievable with sequential processing
- No transaction semantics needed — if import fails partway, re-run from scratch

### Import Flow

```
1. Validate source directory exists with expected structure
2. Create STAC catalog at target path
3. For each source file:
   a. Detect format by extension (.rep/.dpf/.dsf)
   b. Parse using appropriate handler (debrief_io.parse)
   c. Create plot with metadata derived from filename/directory
   d. Add parsed GeoJSON features to the plot
   e. Copy source file as STAC asset with provenance
   f. Update temporal metadata
   g. Record result (success/failure/warnings)
4. Rebuild collection summaries once at end
5. Generate summary report
```

### Alternatives Considered

| Alternative | Rejected Because |
|------------|-----------------|
| Batch STAC API (deferred writes) | Over-engineering for a one-time operation |
| MCP tool exposure | Not needed — this is a development/CI script, not a user-facing service |
| Incremental re-import | Out of scope per spec; full re-run is simpler |
| Parallel file processing | Unnecessary complexity; sequential is fast enough |

---

## R4: STAC Catalog Organization

### Decision

Organize the demo catalog by scenario category derived from the legacy directory structure. Each source file becomes one plot. Plot IDs use a kebab-case slug derived from the filename.

### Rationale

- Legacy directory structure already groups files by purpose (Demo/, SATC/, MultiStatics/, etc.)
- One plot per file is the simplest mapping and matches the existing STAC service model
- Scenario categories provide meaningful grouping for stakeholder demos

### Catalog Structure

```
demo/catalog/
├── catalog.json                    # STAC Collection (auto-promoted)
├── demo-boat1/
│   ├── item.json                   # Plot with category tag "demo"
│   ├── features.geojson
│   └── assets/
│       └── boat1.rep               # Original source file
├── satc-satc-test1/
│   ├── item.json                   # Plot with category tag "satc"
│   ├── features.geojson
│   └── assets/
│       └── SATC_Test1.dpf
└── ...
```

### Category Mapping

| Legacy Directory | Category Tag |
|-----------------|-------------|
| `sample_data/` (root) | `general` |
| `Demo/` | `demo` |
| `MultiPath/` | `multi-path` |
| `MultiStatics/` | `multi-static` |
| `S2R/` | `s2r` |
| `SATC/` | `satc` |
| `SATC_Test/` | `satc-test` |

### Alternatives Considered

| Alternative | Rejected Because |
|------------|-----------------|
| Flat catalog (no categories) | Loses meaningful grouping from legacy structure |
| STAC Collections per category | Over-complex for ~148 items; tags are sufficient |
| Multi-file plots (merge related files) | Harder to trace provenance; one-to-one is cleaner |

---

## R5: Source File Acquisition Strategy

### Decision

The import script accepts a local directory path containing the legacy sample data. Acquisition (clone, download, etc.) is the user's responsibility and documented in quickstart.md.

### Rationale

- Constitution Art. I.1 — offline by default; no network calls in the import script
- Separating acquisition from import keeps the pipeline simple and testable
- Users may already have the legacy repo cloned

### Alternatives Considered

| Alternative | Rejected Because |
|------------|-----------------|
| Auto-clone legacy repo | Requires network; violates offline-by-default principle |
| Bundle sample data in this repo | 86 MB of source data is too large; only parsed output is committed |
| Git submodule | Adds complexity; unnecessary ongoing dependency |

---

## R6: Sensor Contact Geometry

### Decision

Sensor contacts without explicit location produce GeoJSON Point features with `null` geometry. The bearing and range are stored in properties for downstream rendering. Sensor contacts with explicit location coordinates produce Point features at those coordinates.

### Rationale

- DSF and DPF sensor contacts typically have NULL location (derived from host track at runtime)
- The import pipeline does not have access to host track position at sensor contact time (track may be in a different file)
- Storing bearing/range in properties preserves all information for future rendering
- This matches the existing REP parser's approach where sensor data is output without computed geometry

### Alternatives Considered

| Alternative | Rejected Because |
|------------|-----------------|
| Compute contact position from host track | Requires cross-file correlation; host track may not be available |
| Skip sensor contacts entirely | Loses valuable data; sensor contacts are key for SATC scenarios |
| Bearing-line geometry | Cannot compute without host track position |

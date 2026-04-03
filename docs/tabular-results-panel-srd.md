# Tabular Results Panel — Software Requirements Document

## 1. Purpose

This document specifies the Tabular Results Panel: the mechanism by which `debrief-calc` tabular tool outputs are displayed to the analyst within the VS Code extension, and optionally persisted to the plot's asset folder.

This document is self-contained and is intended for use in Claude Code implementation sessions without assumed background knowledge.

---

## 2. Scope and Context

### 2.1 What this covers

The Tabular Results Panel handles the display and optional persistence of outputs from `debrief-calc` tools whose primary payload is numeric or statistical data. These tools return GeoJSON, but the geometry is incidental scaffolding; the analytical value lives in `properties`.

**Tools in scope:**

| Tool | Geometry | Payload |
|------|----------|---------|
| `track-stats` | Point (centroid) | Flat statistics: point count, duration, distance, average speed |
| `area-summary` | Polygon (bbox) | Flat statistics: area, width, height, centroid |
| `range-bearing` | Point | Time-series arrays: `{time, range, bearing}` rows |

### 2.2 What this does NOT cover

- `mutation/*` tools (styling, courses/speeds, shape transforms) — these write back to plot GeoJSON immediately and are unaffected by this specification.
- `addition/*` tools (zones, reference points) — these also write back to plot GeoJSON immediately and are unaffected.
- Chart rendering implementation detail — the existing Vega-Lite / vega-embed stack is used. No new charting dependency is introduced.

### 2.3 Relationship to existing components

- **Prov Log (Analysis Log)** — all tool runs are recorded as PROV entries. This document specifies how `persisted` status interacts with those entries.
- **debrief-stac** — saved files are registered as STAC assets on the plot Item.
- **Tool registry / LinkML schema** — each tabular tool declares its `default_display` and `vega_lite_spec`. This document specifies the required schema additions.

---

## 3. Result Type Taxonomy — Clarification

The `debrief-calc` registry classifies tool outputs via hierarchical paths:

- `mutation/*` — modifies existing features
- `addition/*` — creates new features
- `deletion/*` — removes features
- `artifact/*` — non-GeoJSON outputs (reserved)

Tabular tools currently appear under various paths. This SRD requires a new top-level category:

- **`dataset/*`** — tabular/statistical outputs; geometry is incidental scaffolding

**Required registry updates:**

| Tool | Current `output_kind` | New `output_kind` |
|------|-----------------------|-------------------|
| `track-stats` | _(varies)_ | `dataset/track_statistics` |
| `area-summary` | _(varies)_ | `dataset/area_summary` |
| `range-bearing` | `dataset/range_bearing_series` | `dataset/range_bearing_series` _(unchanged if already set)_ |

All `dataset/*` tools are handled by the Tabular Results Panel. No other tools use this panel.

---

## 4. Schema Changes

### 4.1 Tool registry additions (LinkML)

Each tool in the registry must declare two new fields:

```yaml
default_display:
  range: DisplayType   # enum: "table" | "chart"
  required: true

vega_lite_spec:
  range: string        # JSON string: Vega-Lite specification
  required: false      # required only when default_display = "chart"
```

**Tool declarations:**

| Tool | `default_display` | `vega_lite_spec` |
|------|--------------------|------------------|
| `track-stats` | `table` | — |
| `area-summary` | `table` | — |
| `range-bearing` | `chart` | Time-series line chart: x = time, y1 = range, y2 = bearing |

### 4.2 No legacy exceptions

All tabular tools must be updated to conform to the new schema. No tool may omit `default_display`. Legacy tool definitions without this field are invalid and will be rejected by schema validation.

### 4.3 PROV record additions

Tool run PROV entries gain a `persisted` field:

```yaml
persisted:
  range: boolean
  required: true
  default: false

saved_filename:
  range: string
  required: false   # populated only when persisted = true
```

---

## 5. Panel Lifecycle

### 5.1 Panel creation

The Tabular Results Panel **does not exist** until the first tabular tool is run in a session. There is no placeholder panel, no empty state, and no prompt. The results area beneath the plot is absent until a result arrives.

### 5.2 Panel appearance

On first result, the results area appears and the plot/results split is set to **70% plot / 30% results**. This split is user-draggable and persisted for the session.

### 5.3 Multiple panels

Each distinct tabular tool type has its own panel within the results area. Panels are arranged **side by side horizontally**.

When two panels are open and a third tool type is run, the new panel opens as a **tab within the rightmost existing panel**, creating a tab group. The tab bar appears at the top of that panel section.

### 5.4 Panel removal

When the analyst closes the plot:
1. All `persisted: false` PROV entries are deleted.
2. All panels are destroyed.
3. The results area disappears.
4. No prompt is shown.

---

## 6. Panel Anatomy

### 6.1 Title bar

The panel title bar contains (left to right):

```
[Tool display name] · [feature name] +N    [unsaved dot?]  [↻ Retry?]  [💾 Save]  [💾✏ Save As]
```

**Title text:**
- Format: `{Tool display name} · {first feature name}` when one or two features selected
- Format: `{Tool display name} · {first feature name} +N` when more than two features, where N = remaining count
- Tooltip on hover reveals the full feature name list

**Unsaved indicator:**
- A dot (·) or asterisk (*) appears in the title when the current result is unsaved (`persisted: false`)
- The dot is removed once the result is saved

**Save button:**
- Highlighted / active when result is unsaved
- Greyed / disabled when result is already saved (no pending unsaved state)

**Save As button:**
- Always active when a result is displayed (allows re-saving under a new name)

**Retry button:**
- Appears only in the error state (see §8.3)
- Hidden in normal and loading states

### 6.2 Panel body

The panel body renders one of:

- **Chart** — Vega-Lite chart rendered via vega-embed, using the tool's declared `vega_lite_spec`
- **Table** — key-value table (flat stats) or row-per-timestep table (time-series)

A toggle control in the panel body allows switching between chart and table views when both are applicable. The toggle state is persisted per tool type in VS Code extension storage (survives session restart).

Tools that declare `default_display: "table"` and have no `vega_lite_spec` do not show a toggle — table is the only view.

---

## 7. Tool Execution Flow

### 7.1 Triggering a run

The analyst selects feature(s) and invokes a tabular tool. The VS Code extension calls `debrief-calc` via MCP.

### 7.2 Loading state

Immediately on invocation:
- Spinner appears in the panel title bar
- If a previous result is displayed, it is greyed out (opacity reduced)
- Save / Save As buttons are disabled during loading

### 7.3 Result arrival

On successful response:
- Previous result (if any) is silently discarded — no prompt, no recovery
- New result rendered in panel body per tool's `default_display`
- Unsaved indicator (dot) appears in title bar
- Save button becomes highlighted
- A PROV entry is created immediately with `persisted: false`

### 7.4 Re-run after tuning

When the analyst tunes parameters via the Prov Log and the tool re-runs:
- Previous unsaved result is silently discarded
- Loading state shown, then new result rendered
- Previous `persisted: false` PROV entry is replaced by the new entry
- If the previous result was saved (`persisted: true`), its PROV entry and STAC asset are unaffected — the new run creates a fresh `persisted: false` entry alongside it

---

## 8. Error State

### 8.1 Trigger

Any MCP call failure or tool execution error.

### 8.2 Display

- Panel body shows an error message: human-readable description of the failure
- Previous result (if any) is cleared
- Retry button appears in the title bar
- Unsaved indicator is removed (there is no result to save)

### 8.3 Recovery

Clicking Retry re-invokes the tool with the same parameters and selection. The loading state is shown immediately.

---

## 9. Save Flow

### 9.1 Save (date-stamped)

The analyst clicks the Save icon button in the title bar.

**Filename format:**
```
{tool-name}_{ISO8601-compact}.csv
```
Example: `range-bearing_20260403T142301Z.csv`

- Timestamp is always UTC
- Tool name uses hyphens (matches registry key)
- `.csv` extension always

**Save location:** The plot's STAC asset folder.

**On save:**
1. CSV file written to asset folder
2. File registered as a STAC asset on the plot Item (atomic with file write)
3. PROV entry updated: `persisted: true`, `saved_filename: "{filename}"`
4. Unsaved dot removed from title bar
5. Save button greyed (disabled)

### 9.2 Save As (named)

The analyst clicks the Save As icon button. An **inline drop-down form** appears from the title bar:

```
Base name: [range-bearing          ]
Tag:       [                       ]
                          [Cancel] [Save]
```

- **Base name** field: pre-filled with the tool name (e.g. `range-bearing`); analyst may edit
- **Tag** field: empty; analyst enters an optional descriptor (e.g. `initial-params`, `high-speed-run`)
- Confirm saves; Cancel dismisses the form

**Filename construction:**
```
{base-name}--{tag}.csv          (when tag is provided)
{base-name}.csv                 (when tag is omitted)
```
Example: `range-bearing--initial-params.csv`

**File write and registration:** identical to §9.1.

### 9.3 CSV format

**Flat statistics tools** (`track-stats`, `area-summary`):
```csv
metric,value
point_count,142
duration_hours,3.7
distance_nm,18.4
average_speed_kts,4.97
```

**Time-series tools** (`range-bearing`):
```csv
time,range_nm,bearing_deg
2026-04-03T14:00:00Z,12.4,047.3
2026-04-03T14:01:00Z,12.1,048.1
...
```

- Timestamps in ISO 8601 UTC
- Numeric values to 4 significant figures
- No trailing whitespace; Unix line endings

---

## 10. Provenance Integration

### 10.1 PROV entry on run

Every tabular tool invocation creates a PROV entry immediately, regardless of whether the result is saved. Fields:

| Field | Value |
|-------|-------|
| `tool` | Tool registry key (e.g. `range-bearing`) |
| `used` | Feature IDs of the selection |
| `timestamp` | UTC timestamp of invocation |
| `parameters` | Tool parameters at time of run |
| `persisted` | `false` |
| `saved_filename` | _(absent)_ |

### 10.2 PROV entry on save

On save, the existing entry is updated:

| Field | Value |
|-------|-------|
| `persisted` | `true` |
| `saved_filename` | Filename only (not full path) |

### 10.3 PROV entry on close

When the plot is closed, all PROV entries with `persisted: false` are deleted. Entries with `persisted: true` are retained permanently.

### 10.4 Prov Log card appearance

- `persisted: true` entries appear as normal cards in the Prov Log
- `persisted: false` entries are visually distinguished (dimmed / italicised) while the plot is open

---

## 11. STAC Asset Registration

On save, the file is registered on the plot's STAC Item as an asset:

```json
{
  "tabular-result-{tool}-{timestamp}": {
    "href": "./assets/{filename}",
    "type": "text/csv",
    "title": "{filename}",
    "roles": ["data"],
    "debrief:tool": "{tool-registry-key}",
    "debrief:persisted_at": "{ISO8601 UTC timestamp}"
  }
}
```

### 11.1 External deletion handling

If the CSV file is deleted from disk externally:
- The STAC asset entry is flagged with `debrief:currency: "unavailable"` (consistent with the Provenance Graph currency model)
- The PROV record is retained unchanged
- If the analyst attempts to access the file via any mechanism, a clear "File not found" message is shown

---

## 12. Display Toggle Persistence

The analyst's choice of chart vs table view is persisted per tool type in VS Code extension storage (`ExtensionContext.globalState`):

```typescript
key: `tabular-panel.display-mode.{tool-registry-key}`
value: "chart" | "table"
```

On panel creation, the stored preference is read first. If no preference is stored, the tool's declared `default_display` is used.

---

## 13. Internationalisation

- All user-facing strings are externalisable (Article X.1)
- Timestamps displayed as UTC (Article X.2)
- Numeric values in CSV use `.` as decimal separator (locale-independent for interoperability)
- Panel title, error messages, and form labels are i18n keys

---

## 14. Accessibility

- Save and Save As buttons have `aria-label` attributes: "Save result" / "Save result as…"
- Unsaved indicator has `aria-label`: "Unsaved result"
- Loading spinner has `role="status"` and `aria-label`: "Running {tool display name}…"
- Error state has `role="alert"`
- Chart has `aria-label` with tool name and feature names; table has standard `<table>` semantics

---

## 15. Test Matrix

| Scenario | Expected outcome |
|----------|-----------------|
| Run tabular tool for first time | Panel appears; 70/30 split; unsaved dot shown; Save highlighted |
| Re-run same tool | Previous result silently replaced; new PROV entry created |
| Run second tabular tool type | Second panel appears side by side |
| Run third tabular tool type | Tab group created in rightmost panel |
| Click Save | CSV written to asset folder; STAC registered; dot removed; Save greyed |
| Click Save As with tag | `{base}--{tag}.csv` written; same save flow as above |
| Click Save As without tag | `{base}.csv` written |
| Tool run fails | Error shown in panel body; Retry button visible; no PROV entry created |
| Retry after error | Loading state; normal result flow |
| Close plot with unsaved result | Silent discard; `persisted: false` PROV entries deleted; panel removed |
| Close plot with saved result | PROV entry retained; STAC asset retained |
| File deleted externally | STAC asset flagged `unavailable`; "File not found" on access |
| Toggle chart/table | Preference stored per tool type; survives session restart |
| Load panel after session restart | Stored display-mode preference applied |

---

## 16. Out of Scope

- Re-opening saved CSV files from the Prov Log (filesystem is the retrieval mechanism)
- Auto-save on close
- Export formats other than CSV
- Multi-panel layout beyond the horizontal + tab-group model specified here
- Remote STAC asset registration
- Undo/redo of save operations

---

## 17. Open Questions

None. All design questions resolved during structured interview, 3 April 2026.

---

## Document Control

| Version | Date | Notes |
|---------|------|-------|
| 0.1 | 2026-04-03 | Initial specification; all decisions from structured interview |

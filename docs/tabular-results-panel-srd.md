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

- **Prov Log (Analysis Log)** — tabular tool runs create PROV `ToolRunEvent` entries. File saves create separate linked `FileSavedEvent` entries. Neither record is mutated after creation.
- **debrief-stac** — saved files are registered as STAC assets on the plot Item.
- **Tool registry / LinkML schema** — each tabular tool declares its `display` type and rendering specification. This document specifies the required schema additions.

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

Each tabular tool in the registry must declare two new fields:

```yaml
display:
  range: DisplayType   # enum: "table" | "chart"
  required: true
  description: >
    How the tool's output is rendered in the Tabular Results Panel.
    This is a declaration, not a default — the analyst cannot change it.

vega_lite_spec:
  range: string        # JSON string: Vega-Lite specification
  required: false      # required when display = "chart"
```

**Tool declarations:**

| Tool | `display` | `vega_lite_spec` |
|------|-----------|------------------|
| `track-stats` | `table` | — |
| `area-summary` | `table` | — |
| `range-bearing` | `chart` | Time-series line chart: x = time, y1 = range, y2 = bearing |

**The `display` field is a declaration, not a preference.** The panel renders exactly what the tool declares. There is no analyst-facing toggle between chart and table view.

### 4.2 No legacy exceptions

All tabular tools must be updated to conform to the new schema. No tool may omit `display`. Legacy tool definitions without this field are invalid and will be rejected by schema validation.

### 4.3 PROV event types

Two distinct PROV event types cover the tabular result lifecycle. Neither record is mutated after creation, preserving audit trail immutability (Constitution Article III.3).

#### ToolRunEvent

Created immediately when a tabular tool is invoked and returns a result. **Not created on error.**

| Field | Type | Value |
|-------|------|-------|
| `id` | ULID | Server-generated; unique per event |
| `event_type` | string | `"tool_run"` |
| `tool` | string | Tool registry key (e.g. `range-bearing`) |
| `used` | string[] | Feature IDs of the selection |
| `timestamp` | string | UTC ISO 8601 timestamp of invocation |
| `parameters` | object | Tool parameters at time of run |

#### FileSavedEvent

Created when the analyst saves a result. References the originating `ToolRunEvent` by ULID.

| Field | Type | Value |
|-------|------|-------|
| `id` | ULID | Server-generated; unique per event |
| `event_type` | string | `"file_saved"` |
| `tool_run_id` | ULID | ID of the originating `ToolRunEvent` |
| `saved_filename` | string | Filename only (not full path) |
| `timestamp` | string | UTC ISO 8601 timestamp of save |

---

## 5. Panel Lifecycle

### 5.1 Panel creation

The Tabular Results Panel **does not exist** until the first tabular tool run returns a result in a session. There is no placeholder panel, no empty state, and no prompt. The results area beneath the plot is absent until a result arrives.

### 5.2 Panel appearance

On first result, the results area appears and the plot/results split is set to **70% plot / 30% results**. This split is user-draggable. The split is held in memory for the VS Code window lifetime only — it resets to 70/30 when the window is restarted.

### 5.3 Multiple panels

Each distinct tabular tool type has its own panel within the results area. Panels are arranged **side by side horizontally**.

When two panels are open and a third tool type is run, the new panel opens as a **tab within the rightmost existing panel**, creating a tab group. The tab bar appears at the top of that panel section.

Beyond two panels, closing and rearranging is delegated to the VS Code window manager. No custom panel close/collapse logic is implemented.

### 5.4 Panel removal

When the analyst closes the plot:
1. All `ToolRunEvent` PROV entries that have no corresponding `FileSavedEvent` are deleted.
2. All panels are destroyed.
3. The results area disappears.
4. No prompt is shown.

---

## 6. Panel Anatomy

### 6.1 Title bar

The panel title bar contains (left to right):

```
[Tool display name] · [feature name(s)]    [unsaved dot?]  [↻ Retry?]  [💾 Save]  [💾✏ Save As]
```

**Title text:**
- Format: `{Tool display name} · {first feature name}` when one feature is selected
- Format: `{Tool display name} · {first feature name} +N` when more than one feature is selected, where N = remaining count
- Tooltip on hover reveals the full feature name list

**Unsaved indicator:**
- A dot (·) or asterisk (*) appears in the title when the current result has no corresponding `FileSavedEvent`
- The dot is removed once a `FileSavedEvent` is recorded for the current `ToolRunEvent`

**Save button:**
- Highlighted / active when result is unsaved
- Greyed / disabled when the current result already has a corresponding `FileSavedEvent`

**Save As button:**
- Always active when a result is displayed (analyst may save additional named copies)

**Retry button:**
- Appears only in the error state (see §8)
- Hidden in normal and loading states

### 6.2 Panel body

The panel body renders the tool's output as declared by the tool's `display` field:

- **`display: "chart"`** — Vega-Lite chart rendered via vega-embed using the tool's `vega_lite_spec`
- **`display: "table"`** — tabular view; column names and structure derived dynamically from the returned data (see §9.5)

There is no analyst-facing toggle between chart and table. The tool's declaration is final.

---

## 7. Tool Execution Flow

### 7.1 Triggering a run

The analyst selects feature(s) and invokes a tabular tool. The VS Code extension calls `debrief-calc` via MCP.

### 7.2 Loading state

If the panel for this tool type already exists with a result displayed:
- Spinner appears in the panel title bar
- Existing result is greyed out (opacity reduced)
- Save / Save As buttons are disabled during loading

If no panel yet exists for this tool type (first run, or after error with cleared display):
- No loading state is shown; the panel materialises when the result arrives

### 7.3 Concurrent runs (last wins)

If the analyst invokes the same tool again while a previous run is still in flight, the earlier response is discarded when it arrives. The most recently invoked run's result is displayed. No queuing.

### 7.4 Result arrival

On successful response:
- Previous result (if any) is silently replaced — no prompt, no recovery
- New result rendered in panel body per tool's `display` declaration
- Unsaved indicator (dot) appears in title bar
- Save button becomes highlighted
- A `ToolRunEvent` PROV entry is created immediately

### 7.5 Re-run after tuning

When the analyst tunes parameters via the Prov Log and the tool re-runs, the flow is identical to §7.4. If the previous result had been saved, its `FileSavedEvent` and STAC asset are unaffected — the new run creates a fresh `ToolRunEvent` alongside the existing saved record.

---

## 8. Error State

### 8.1 Trigger

Any MCP call failure or tool execution error.

### 8.2 Display

- Panel body shows a human-readable error message
- Previous result (if any) is cleared
- Retry button appears in the title bar
- Unsaved indicator is removed
- **No `ToolRunEvent` PROV entry is created**

### 8.3 Recovery

Clicking Retry re-invokes the tool with the same parameters and selection. The loading state (§7.2) applies.

---

## 9. Save Flow

### 9.1 Filename sanitisation

All analyst-supplied text in base name and tag fields is passed through a filename sanitiser before use. The sanitiser:
- Replaces any character not in `[A-Za-z0-9._-]` with `-`
- Collapses consecutive `-` into one
- Trims leading and trailing `-`
- Truncates base name to 64 characters, tag to 32 characters

This produces safe filenames on Windows, macOS, and Linux without requiring the analyst to understand filesystem constraints.

### 9.2 Collision handling

**Date-stamped Save:** The filename includes millisecond-precision UTC timestamp (see §9.3). If a file with the same name already exists (same tool, same millisecond — pathological case), a numeric suffix is appended: `range-bearing_20260403T142301123Z-2.csv`.

**Save As:** If the constructed filename already exists in the asset folder, a prompt is shown: *"{filename} already exists. Overwrite?"* with Overwrite / Cancel options.

### 9.3 Save (date-stamped)

The analyst clicks the Save icon button in the title bar.

**Filename format:**
```
{tool-name}_{YYYYMMDD}T{HHmmss}{SSS}Z.csv
```
Example: `range-bearing_20260403T142301123Z.csv`

- Timestamp is always UTC with millisecond precision
- Tool name uses hyphens (matches registry key)

**Save location:** The plot's STAC asset folder.

**On save:**
1. Data sanitised and written as CSV to asset folder
2. File registered as a STAC asset on the plot Item
3. If the file write succeeds but STAC registration fails: the file is deleted and an error is shown — no partial state (Constitution Article I.3)
4. If both succeed: a `FileSavedEvent` PROV entry is created referencing the current `ToolRunEvent` ULID
5. Unsaved dot removed from title bar; Save button greyed

### 9.4 Save As (named)

The analyst clicks the Save As icon button. An **inline drop-down form** appears from the title bar:

```
Base name: [range-bearing          ]
Tag:       [                       ]
                          [Cancel] [Save]
```

- **Base name** field: pre-filled with the tool registry key; analyst may edit
- **Tag** field: empty; analyst enters an optional descriptor (e.g. `initial-params`, `high-speed-run`)
- Both fields pass through the sanitiser in §9.1 before use
- Confirm saves; Cancel dismisses the form without saving

**Filename construction:**
```
{base-name}--{tag}.csv          (when tag is provided)
{base-name}.csv                 (when tag is omitted)
```
Example: `range-bearing--initial-params.csv`

**File write, STAC registration, and PROV:** identical to §9.3.

### 9.5 CSV format

Column names are derived dynamically from the keys present in the tool's returned data — no hardcoded column list. This ensures new and updated tools remain compatible without frontend changes.

**Flat statistics tools** (`track-stats`, `area-summary`):

Two-column format, one row per metric:
```csv
metric,value
point_count,142
duration_hours,3.7
distance_nm,18.4
average_speed_kts,4.97
```

**Time-series tools** (`range-bearing`):

One row per time step; column names taken from the `__datasets` array keys:
```csv
time,range_nm,bearing_deg
2026-04-03T14:00:00Z,12.4,047.3
2026-04-03T14:01:00Z,12.1,048.1
```

**Rules applying to all CSV output:**
- Timestamps in ISO 8601 UTC
- Numeric values to 4 significant figures
- Decimal separator is `.` (locale-independent)
- Unix line endings; no trailing whitespace; UTF-8 encoding

---

## 10. Provenance Integration

### 10.1 ToolRunEvent — created on successful run

| Field | Value |
|-------|-------|
| `id` | Server-generated ULID |
| `event_type` | `"tool_run"` |
| `tool` | Tool registry key |
| `used` | Feature IDs of the selection |
| `timestamp` | UTC ISO 8601 |
| `parameters` | Tool parameters at time of run |

No entry created on error (§8.2).

### 10.2 FileSavedEvent — created on save

| Field | Value |
|-------|-------|
| `id` | Server-generated ULID |
| `event_type` | `"file_saved"` |
| `tool_run_id` | ULID of the originating `ToolRunEvent` |
| `saved_filename` | Filename only (not full path) |
| `timestamp` | UTC ISO 8601 of save action |

### 10.3 PROV cleanup on plot close

When the plot is closed, `ToolRunEvent` entries that have no corresponding `FileSavedEvent` are deleted. All other PROV entries are retained permanently.

### 10.4 Prov Log card appearance

- `ToolRunEvent` with a corresponding `FileSavedEvent` — normal card; filename shown as metadata
- `ToolRunEvent` with no corresponding `FileSavedEvent` — dimmed / italicised card (unsaved run)
- `FileSavedEvent` — not shown as a standalone card; its data is surfaced on the parent `ToolRunEvent` card

---

## 11. STAC Asset Registration

On save, the file is registered on the plot's STAC Item as an asset. The asset key uses the `FileSavedEvent` ULID to guarantee uniqueness:

```json
{
  "tabular-result-{tool}-{FileSavedEvent-ULID}": {
    "href": "./assets/{filename}",
    "type": "text/csv",
    "title": "{filename}",
    "roles": ["data"],
    "debrief:tool": "{tool-registry-key}",
    "debrief:tool_run_id": "{ToolRunEvent ULID}",
    "debrief:persisted_at": "{ISO8601 UTC timestamp}"
  }
}
```

### 11.1 External deletion detection

A background scanner runs every **60 minutes** and checks all registered CSV assets against the plot's asset folder. If a file is absent:
- The STAC asset entry is updated with `debrief:currency: "unavailable"` (consistent with the Provenance Graph currency model)
- The PROV records are retained unchanged
- The affected Prov Log card shows a "File not found" indicator on next access

---

## 12. Internationalisation

- All user-facing strings are externalisable (Constitution Article X.1)
- Timestamps displayed as UTC (Constitution Article X.2)
- Numeric values in CSV use `.` as decimal separator (locale-independent for interoperability)
- Panel title, error messages, and form labels are i18n keys

---

## 13. Accessibility

- Save and Save As buttons have `aria-label` attributes: "Save result" / "Save result as…"
- Unsaved indicator has `aria-label`: "Unsaved result"
- Loading spinner has `role="status"` and `aria-label`: "Running {tool display name}…"
- Error state has `role="alert"`
- Chart has `aria-label` with tool name and feature names; table has standard `<table>` semantics

---

## 14. Test Matrix

| Scenario | Expected outcome |
|----------|-----------------|
| Run tabular tool for first time | Panel appears; 70/30 split; unsaved dot shown; Save highlighted; `ToolRunEvent` created |
| Run tabular tool — tool fails | Error shown in panel body; Retry visible; **no** `ToolRunEvent` created |
| Retry after error | Loading state (if panel already existed with result); normal result flow on success |
| Re-run same tool while previous run in flight | Earlier response discarded; last result wins |
| Re-run same tool after result displayed | Previous result silently replaced; new `ToolRunEvent` created |
| Run second tabular tool type | Second panel appears side by side |
| Run third tabular tool type | Tab group created in rightmost panel |
| Click Save | CSV written; STAC registered; `FileSavedEvent` created; dot removed; Save greyed |
| Save — file write succeeds, STAC fails | File deleted; error shown; no `FileSavedEvent`; unsaved state preserved |
| Click Save As with tag | `{base}--{tag}.csv` written; same flow as Save |
| Click Save As without tag | `{base}.csv` written |
| Save As — filename already exists | Prompt: "Overwrite?" with Overwrite / Cancel |
| Save within same millisecond twice | Second file gets `-2` suffix |
| Input with unsafe characters in Save As | Sanitised silently; safe filename shown in form before confirm |
| Close plot with unsaved result | Silent discard; orphaned `ToolRunEvent` PROV entries deleted; panels removed |
| Close plot with saved result | `ToolRunEvent` + `FileSavedEvent` retained; STAC asset retained |
| File deleted externally | Detected within 60 min scan; STAC asset flagged `unavailable`; card shows "File not found" |
| Prov Log card — unsaved run | Card dimmed / italicised |
| Prov Log card — saved run | Normal card; filename shown as metadata |
| Session restart | Split resets to 70/30; panels absent until next tool run |

---

## 15. Out of Scope

- Re-opening saved CSV files from the Prov Log (filesystem is the retrieval mechanism)
- Auto-save on close
- Export formats other than CSV
- Analyst toggle between chart and table (display is tool-declared)
- Multi-panel layout beyond the horizontal + tab-group model specified here
- Remote STAC asset registration
- Undo/redo of save operations
- Analyst-configurable split persistence across sessions

---

## 16. Open Questions

None. All design questions resolved during structured interview and critic review pass, 3 April 2026.

---

## Document Control

| Version | Date | Notes |
|---------|------|-------|
| 0.1 | 2026-04-03 | Initial specification from structured interview |
| 0.2 | 2026-04-03 | Critic review resolutions: two-event PROV model (immutability preserved), no PROV on error, millisecond-precision filenames, collision handling, filename sanitisation, 60-min external deletion scan, ULID asset keys, session-only split persistence, last-wins concurrency, dynamic CSV columns, tool-declared display (no analyst toggle) |

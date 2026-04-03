# SRD: Analysis Log Panel — Rich Card UX

**Feature:** `debrief:log-panel`  
**Status:** Draft  
**Author:** Ian Mayo / Claude  
**Date:** 2026-03-31  

---

## 1. Purpose

The Analysis Log panel surfaces the PROV provenance record as an analyst-facing audit trail. The current implementation renders raw PROV data — tool names, positional parameter indices, ISO durations — with no domain interpretation. This SRD specifies a richer card-based UX that presents the same underlying data in analyst-readable form, without modifying the provenance model.

---

## 2. Context and Constraints

- The panel renders within the VS Code extension webview (primary) and, in future, the Electron loader.
- The PROV record is owned by `debrief-stac`. The panel is **read-only with respect to persistence** — all writes (edits, disabling, rationale) route through existing MCP tools (`debrief:log-edit`, etc.).
- Styling must conform to the VS Code light theme. No dark-mode-only colour choices.
- Colour is already heavily used in the map canvas for track identity. **Parameter type must not be communicated by colour alone.** Icons are used instead.
- Constitution Article IV applies: the panel frontend orchestrates calls and renders data; it does not implement domain logic.
- Constitution Article III.1: provenance records are immutable once written. The panel reflects this — no in-place mutation of displayed records.

---

## 3. Data Model (Reference)

Each log entry maps to a PROV `Activity` with the following fields relevant to the UX:

| Field | UX use |
|---|---|
| `tool` | Card title |
| `tool_version` | Tooltip on card title |
| `parameters[].value` | Parameter chip value |
| `parameters[].default` | Non-default marker (●) |
| `parameters[].tunable` | Edit eligibility (future flip-card) |
| `used[]` | Input feature IDs (Detail view) |
| `generated[]` | Output feature IDs (Detail view) |
| `timestamp` | Card meta time |
| `execution_duration` | Card meta duration |
| `disabled` | Disabled state rendering |
| `rationale` | Rationale icon presence |
| `input_state[]` | Pre-operation snapshot (future diff view) |

Parameter type is not currently encoded in the PROV schema. Type inference is performed client-side by a `inferParamType(value)` utility, with tool-schema override taking precedence when available (see §6.3).

---

## 4. Card Structure

Each log entry is rendered as a **card** — a self-contained visual unit. Cards are stacked vertically in the panel, newest-first by default (Timeline view).

### 4.1 Anatomy

```
┌─────────────────────────────────────┐
│ [n]  [icon]  tool-name          [💬]│  ← header
│       track-badge  HH:MM:SS · Xms   │  ← meta
│       param-label [chip] label [chip]│  ← params
└─────────────────────────────────────┘
```

**Header row**
- Step number `[n]` — 1-indexed sequential position in the log. Tabular numeric, muted colour.
- Tool icon — 18×18px coloured square, emoji or codicon glyph. Background colour is per tool *category* (import / style / calc / filter / snapshot), not per tool instance. See §5.
- Tool name — semibold, 12px.
- Rationale icon `💬` — shown only when `rationale !== null`. Right-aligned. Hover shows rationale text as tooltip.

**Meta row**
- Track badge — `platform_name` from the first entry in `used[]`. Pill badge, `#e8e8e8` background.
- Disabled badge — shown only when `disabled === true`. `#fde8e8` background, red text, label "disabled".
- Timestamp — `HH:MM:SS UTC` from `timestamp`.
- Duration — formatted from `execution_duration` ISO 8601 duration. Display rules: `< 1 s` → `Xms`; `≥ 1 s` → `X.Xs`. Not shown for snapshot entries.

**Params row**
- Each parameter rendered as a `param-label` + `chip` pair.
- If no parameters: render `No parameters` in muted italic.
- Snapshot entries render `Manual checkpoint` in muted italic.

### 4.2 Selected State

Clicking a card sets it as selected. Selected card: `border-color: #0078d4`, `background: #f0f6ff`. One card selected at a time within a panel instance. Selection is local UI state — not persisted.

### 4.3 Disabled State

When `disabled === true`:
- Card opacity reduced to 50%.
- Disabled badge shown in meta row.
- Card is still clickable and selectable.
- Parameters still rendered (the entry exists; it is suppressed from calculation, not deleted).

---

## 5. Tool Category Icons

Tool category is declared in the tool manifest. Until a manifest is available for a given tool, a neutral grey background is used with no glyph override. Five categories are defined for MVP:

| Category | Background | Glyph | Example tools |
|---|---|---|---|
| `import` | `#dbeafe` | ⬇ | `dpf-parser`, `rep-loader` |
| `style` | `#ede9fe` | 🎨 | `set-track-color`, `set-line-width` |
| `calc` | `#dcfce7` | ∿ | `interpolate-track`, `tma-solve` |
| `filter` | `#fff7ed` | ⧖ | `filter-by-depth`, `trim-track` |
| `snapshot` | `#fef9c3` | 📷 | `snapshot` |

Category background colour serves only to distinguish tool families at a glance — it carries no semantic meaning about the operation's state or outcome. Unknown tools use a neutral grey background.

---

## 6. Parameter Chips

### 6.1 Chip Design

All chips share a single visual style regardless of parameter type:

```
background: #f4f4f4
border: 1px solid #d8d8d8
border-radius: 4px
padding: 2px 6px
font-size: 10px
color: #333
```

Type is indicated by a prefix **icon** inside the chip, not by chip colour.

### 6.2 Parameter Types

| Type | Icon | Example rendered chip |
|---|---|---|
| Colour | *(swatch only — colour block is self-describing)* | `█ green` |
| Number | `#` | `# 30 s` |
| Enum / string | `≡` | `≡ linear` |
| Range | `↔` | `↔ 10 m – 200 m` |
| Boolean | `⊤` / `⊥` | `⊤ yes` or `⊥ no` |

Colour chips render a 11×11px swatch block (actual colour value) followed by the name string. No additional icon prefix — the swatch is unambiguous.

Boolean chips use logical top/bottom symbols (`⊤`/`⊥`) rather than coloured indicators, to avoid competition with map track colours.

### 6.3 Type Inference

Type is resolved in priority order:

1. **Tool schema** — if the tool exposes a parameter schema via MCP tool metadata, use declared type.
2. **Heuristic** — client-side `inferParamType(value: unknown): ParamType`:
   - CSS colour string or named colour → `colour`
   - `boolean` JS type → `boolean`
   - `number` JS type → `number`
   - Object with `min`/`max` keys → `range`
   - String → `enum`
3. **Fallback** — render as plain string with no icon.

### 6.4 Non-Default Marker

When `parameters[i].default === false`, a small red dot `●` (6px, `#e53e3e`) is rendered superscript-right of the chip. This signals that the analyst has made an active choice — the tool was not run with defaults.

---

## 7. Panel Header and Tabs

### 7.1 Header

```
DEBRIEF LOG: LOG
```

Static label. No interactive elements in the header row itself. Panel-level actions (Revert, Snapshot, Rationale) are deferred to a separate SRD.

### 7.2 View Tabs

Five tabs are retained from the current implementation for continuity, but their content semantics are clarified:

| Tab | Behaviour |
|---|---|
| Timeline | All entries, newest-first. **Default.** |
| By Feature | Entries grouped by `platform_name` (track). Collapsible groups. |
| Compact | Card height reduced: header + meta only, no params row. |
| Detailed | Full card + expanded `used[]`/`generated[]` feature ID lists. |

---

## 8. Empty and Error States

| Condition | Display |
|---|---|
| No log entries | Centred message: "No operations recorded yet." |
| Entry with unknown tool | Card renders with neutral grey icon, tool name verbatim, raw parameter values as string chips. No error shown. |
| `rationale` present but empty string | Treat as `null` — do not show `💬` icon. |
| `execution_duration` missing | Duration field omitted from meta row silently. |

---

## 9. Accessibility

- All chips and badges carry `aria-label` values describing type and value (e.g. `aria-label="colour: green"`).
- The `💬` rationale icon carries `aria-label="Rationale: [rationale text]"`.
- Selected card state reflected via `aria-selected="true"`.
- Step number included in card `aria-label` (e.g. `aria-label="Step 2: set-track-color"`).
- Tab panel follows ARIA `tablist`/`tab`/`tabpanel` pattern.

---

## 10. Out of Scope (This SRD)

The following are explicitly deferred:

- **Flip-card edit face** — editing parameters, disabling entries, adding rationale. Subject of a separate SRD.
- **Panel-level actions** — Revert to here, Revert this, Snapshot button placement.
- **Card drag-to-reorder** — deferred post-MVP.
- **Filtering and search** — deferred post-MVP.
- **Map selection linkage** — clicking a card does not yet highlight features on the map canvas.
- **Time axis visualisation** — relative timing of ops against track timeline.
- **Diff view** — comparing `input_state` before/after an operation.
- **Audit export** — generating a human-readable report from the log.

---

## 11. Compliance Notes

| Article | Compliance |
|---|---|
| I.3 (No silent failures) | Empty/error states explicitly specified (§8). |
| III.1 (Provenance always) | Panel is read-only; does not modify provenance records. |
| III.3 (Audit trail immutable) | Confirmed — no write path in this component. |
| IV.1 (Services never touch UI) | Chip type inference and rendering logic is purely frontend. |
| IV.2 (Frontends never persist) | All write operations routed through existing MCP tools (out of scope this SRD). |
| X.1 (I18N from start) | All user-facing strings (`No parameters`, `Manual checkpoint`, tab labels, aria-labels) must use i18n string keys, not literals. |

---

## 12. Open Questions

| # | Question | Status |
|---|---|---|
| 1 | Should tool category be inferred from name prefix, or declared in a tool manifest? | **Resolved** — declared in tool manifest. Until manifest is available, all tools render with neutral grey icon. No name-prefix inference. |
| 2 | Should the `Normal` tab be removed now or in a follow-up? | **Resolved** — removed in this pass. |
| 3 | Multiple tracks in a single operation (`used[]` has >1 platform) — which track badge is shown? | **Resolved** — all track badges shown, wrapping onto a second line if needed. |
| 4 | Should `timestamp` display analyst local time or UTC? | **Resolved** — UTC always. Format: `HH:MM:SS UTC`. |

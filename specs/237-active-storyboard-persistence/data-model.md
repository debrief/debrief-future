# Data Model — Active-Storyboard Selection Persistence

**Feature**: #237
**Date**: 2026-05-06

This feature introduces no new schema-level entities. The LinkML
Storyboard schema is unchanged. The "data model" below describes the
**runtime persistence shape** (what each host adapter writes and reads)
and the **invariants** that hold across hosts.

---

## Persistence Entity: `ActiveStoryboardSelectionMap`

A single per-user, per-host-install JSON object that maps a plot's
`itemPath` to the analyst's last-selected Storyboard ID for that plot.

### Logical shape

```ts
type ItemPath = string;        // absolute STAC item.json path
type StoryboardId = string;    // StoryboardFeature.properties.id

type ActiveStoryboardSelectionMap = Record<ItemPath, StoryboardId>;
```

### Storage location

| Host | Backend | Container | Container key |
|------|---------|-----------|---------------|
| VS Code extension | `@debrief/config` (Node, `~/.config/debrief/config.json` and OS-equivalents) | A single scalar string preference (because `PreferenceValue` is `string \| number \| boolean \| null`) | `activeStoryboardSelections` |
| Web-shell | Browser `localStorage` (per-origin, per-browser-install) | A single string value | `debrief.activeStoryboardSelections` |

The container value is a JSON-stringified `ActiveStoryboardSelectionMap`.
The two container locations are **independent** — there is no replication
or sync layer between them.

### Field reference (logical)

| Field | Type | Description | Source of truth |
|-------|------|-------------|-----------------|
| `<itemPath>` | string (absolute STAC item.json path) | Stable per-plot key. Both hosts already use this same string to identify open plots. | VS Code: `EditSessionManager.resolveStoreContext(documentUri).itemPath`. Web-shell: `App.tsx → currentPlot.itemPath`. |
| `<itemPath value>` | `StoryboardId` (string) | The `properties.id` of the Storyboard the analyst last selected for this plot. | The `StoryboardFeature.properties.id` field as defined by #215 schema. Stable across edits. |

### Validation rules

- **V-1: Map values are validated on read.** When the adapter parses
  the JSON-stringified map, it MUST guard against:
  - The container value not being a string (e.g. an old preference
    of a different type) → treat as empty map.
  - The string not being valid JSON → treat as empty map; log a single
    non-fatal warning (FR-012).
  - The parsed JSON not being a flat object whose every value is a
    string → treat as empty map; log a single non-fatal warning.
  Adapter MUST NOT throw to the caller in any of these cases.
- **V-2: Adapter never returns a value if the recorded Storyboard ID
  is not present in the plot.** This validation lives in the host
  mount layer (see lifecycle below), NOT in the adapter — the
  adapter doesn't know about plots. The host calls
  `store.get(itemPath)`, then verifies the returned ID is present in
  `plot.features` via the same iteration the existing
  `getActiveStoryboardDefault` performs; if it isn't, the host
  ignores the return value and lets the default fallback take over.
- **V-3: `set(itemPath, null)` removes the entry.** Adapters MUST
  treat a `null` second argument as "clear this plot's record",
  not "store the literal string `'null'`".

### Lifecycle

| Trigger | Operation | Effect |
|---------|-----------|--------|
| Plot opens (host's `onPlotOpened` / `useEffect` on `(itemPath, plot)` change) | `store.get(itemPath)` | Returns `string \| null`. Host validates per V-2; if valid, seeds `state.activeStoryboardId` (VS Code) or `activeOverrideId` (web-shell). If invalid, falls back to `getActiveStoryboardDefault(plot)`. |
| Analyst picks a different Storyboard from the side-rail dropdown | `store.set(itemPath, storyboardId)` | Persists immediately. No save dialog, no provenance entry, no plot-file write. |
| Analyst creates a new Storyboard via the side rail and switches to it (existing behaviour from #235) | `store.set(itemPath, newStoryboardId)` (the existing `setActiveOverrideId` post-create call site already triggers this) | Same as the dropdown override path. |
| The analyst's recorded Storyboard is deleted in another session (V-2 fails on next open) | Host falls back to default; on next override or default-acceptance, the stale record is overwritten or cleared | Self-heals over time. No banner, no toast (FR-007). |
| Plot file is moved to a new path (`itemPath` changes) | (no operation — the new `itemPath` simply has no record yet) | Analyst sees the default selection on first open at the new path; this is the documented edge-case behaviour from spec §Edge Cases. |
| Adapter read fails (corrupted file, file lock timeout, browser storage disabled) | Adapter returns `null` and logs once | Host falls back to default. Panel renders normally. |
| Adapter write fails (disk full, quota exceeded) | Adapter swallows the exception and logs once | Selection stays in memory for the lifetime of the panel mount; next reopen of the same plot reverts to the previous record (or default). |

### Concurrency

The map is read-modify-written as one container value. Two hosts on
the same machine writing simultaneously may produce a last-writer-wins
clobber — accepted per FR-013 / spec edge cases. No locking beyond
what `@debrief/config` (file lock, atomic rename via temp file) and
`localStorage` (single-threaded JS within an origin) already provide.

The map is **not** shared between origins or user accounts (V-1 / FR-010
guarantee independence at the storage-key level). The web-shell
container key (`debrief.activeStoryboardSelections`) is per-origin,
per-browser-install; the `@debrief/config` preference is per-user,
per-machine.

### Sizing assumptions

- A typical analyst has O(10) plots in active rotation at any time.
- `itemPath` keys are bounded by the OS path-length limit (typically
  ≤ 4 KB on Linux/macOS; ≤ 260 chars on Windows without long-path
  support).
- `StoryboardId` values are short (the existing schema produces
  ULID-like strings, ~26 chars).
- A 100-plot map is well under 64 KB — comfortably below `localStorage`
  per-origin limits (typically 5–10 MB) and far below
  `@debrief/config`'s atomic-write bandwidth.

### What is **not** in this entity

The following are explicitly out of model:

- **Timestamps** (e.g. "when did the analyst last switch?"). The spec
  doesn't require staleness-based eviction or display, and adding
  timestamps would inflate the value with no payoff.
- **History** (e.g. "the previous selection before this one"). Spec
  Out-of-Scope §: no "clear pin" affordance, no history viewer.
- **User identity** (e.g. who picked this?). The map is per-user by
  virtue of its container; recording user identity inside the map
  would invent multi-user semantics the spec rejects (FR-010).
- **Provenance** (e.g. an entry in the plot's `provenance` chain).
  Per FR-014, this feature does not touch plot provenance.

---

## Relationships to existing entities

```
StoryboardFeature  (#215 LinkML schema, unchanged)
  └─ properties.id  ◄─────────────────┐
                                       │ stores
SceneFeature (#215 LinkML, unchanged)  │ (by ID)
                                       │
Plot (a FeatureCollection of the above)│
  └─ itemPath ─────────────────────────┤
        ▲                              │
        │ keys                         │
        │                              │
   ActiveStoryboardSelectionMap  ◄─────┘
   (RUNTIME ONLY — not part of plot file)
   ├─ host: VS Code → @debrief/config preference
   └─ host: web-shell → browser localStorage
```

The map references `StoryboardFeature.properties.id` and uses
`itemPath` as a key; it never embeds copies of either entity. There
is no foreign-key constraint at the storage layer — V-2 (host-side
validation against the live plot on every read) is the only integrity
guarantee, which is correct because the live plot is authoritative
and the persisted map is hint data.

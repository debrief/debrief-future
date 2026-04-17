# Data Model: Properties Panel (#191)

This feature introduces **two** LinkML-shaped additions to `StacExtensionProperties`:

1. `debrief:overrides` — flat array of field names the analyst has overridden (skip-list for auto-derivation).
2. `debrief:provenance_log` — bounded array of per-commit provenance entries.

Plus one new PropertiesProvenanceEntry class (used by the array in #2). Everything else below is TypeScript contract shape (messages, service method inputs, form component props) captured in `contracts/`.

There is **no** `PropertiesSlice` — Decision 2 (post-review) dropped session-state staging in favour of direct-write via `stacService.updateItemMetadata`.

---

## 1. LinkML schema change: `debrief:overrides`

**Where**: `shared/schemas/src/linkml/stac-extension.yaml`, within `StacExtensionProperties`.

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `debrief:overrides` | `array<string>` | No (default `[]`) | Flat list of field names on `item.properties` that the analyst has overridden. Auto-derivation routines (`stacService.updateTemporalMetadata` today; future #135 derivation) MUST skip any field whose name appears here. |

**Validation**:

- Each entry MUST be a valid single-segment key (e.g. `"start_datetime"`, `"debrief:tags"`, `"title"`). Nested paths not supported in v1.
- Duplicates MUST be deduplicated on write.
- Sorted alphabetically on write for deterministic output.
- Removing an entry is out of scope for v1 (deferred: "revert to auto-derived").

**State transitions**:

```
user commits a non-override field → append key to debrief:overrides (dedupe)
user commits an already-override field → no change (key already present)
user-initiated revert → out of scope (follow-up)
```

**Schema tests** (Article II.2):

- Golden fixture: `item.json` with `debrief:overrides: ["start_datetime"]` validates against generated JSON Schema and round-trips through Python → JSON → TypeScript → JSON → Python unchanged.
- Structural comparison: gen-pydantic and gen-jsonschema outputs agree on field type and optionality.

---

## 2. LinkML schema change: `debrief:provenance_log` + `PropertiesProvenanceEntry`

**Where**: `shared/schemas/src/linkml/stac-extension.yaml`.

**New class** `PropertiesProvenanceEntry`:

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `activity_id` | `string` (ULID) | Yes | Unique identifier per commit. |
| `timestamp` | `string` (ISO-8601 UTC) | Yes | Write time, set by `stacService.updateItemMetadata`. |
| `tool` | `string` | Yes | Sentinel — MUST equal `"debrief.propertiesPanel"`. |
| `method` | `string` | Yes | Versioned method identifier, matching pattern `^properties-panel@.+$`. |
| `fields` | `array<string>` | Yes | Non-empty list of field names touched by this commit. |
| `source` | `string` | Yes | MUST equal `"user"`. |

**New field on `StacExtensionProperties`**:

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `debrief:provenance_log` | `array<PropertiesProvenanceEntry>` | No (default `[]`) | Per-commit provenance entries for Properties Panel edits. Bounded at 500 entries; overflow rotates to sibling `provenance_log_archive.jsonl` in the item directory. |

**Invariants**:

- Entries MUST be append-only. Mutation or deletion of an existing entry is a bug (Article III.3 — audit trail immutable).
- `fields` length ≥ 1; an empty commit MUST NOT produce an entry.
- Array length ≤ 500; writer MUST rotate oldest into archive before write when cap reached.
- Archive file is newline-delimited JSON — one entry per line; append-only; atomic write (temp+rename).

**Schema tests** (Article II.2): golden fixture + round-trip tests for both the class and the array field.

---

## 3. Commit message (webview → extension)

**Where**: a single new message variant shared by both surfaces. Extending `ActivityPanelMessage` (`shared/components/src/ActivityPanel/types.ts`) and `StacBrowserMessage` (`shared/components/src/StacBrowser/types.ts`).

```typescript
interface PropertiesCommitMessage {
  type: 'properties:commit';
  storePath: string;
  itemPath: string;
  patch: Record<string, unknown>; // flat {field: value} — usually one entry per commit
}
```

No `properties:update` / `properties:discard` / `properties:save-direct-batch` variants — Decision 2 collapsed them into this single direct-write message.

Extension handlers (in `apps/vscode/src/panels/activityPanelView.ts` and `apps/vscode/src/panels/stacBrowserPanel.ts`) translate this message into a single call:

```typescript
stacService.updateItemMetadata({ storePath, itemPath, patch, provenance, packageVersion });
```

---

## 4. Service method input/output

See `contracts/stac-service-extension.ts` for the full contract. Summary:

```typescript
input:  { storePath, itemPath, patch, overrideFields, provenance, packageVersion }
output: { updatedProperties, overrides, activityId }
throws: StaleItemJsonError | SchemaValidationError | ReadOnlyFilesystemError
```

---

## 5. Auto-derived field registry

**Where**: `apps/vscode/src/services/stacService.ts` (co-located with `updateTemporalMetadata`).

**Shape**:

```typescript
const AUTO_DERIVED_FIELDS: ReadonlySet<string> = new Set([
  'start_datetime',
  'end_datetime',
  'datetime',
  // Future #135 fields extend this set.
]);
```

**Rules**:

- A field rendered with an "auto-derived" chip iff `AUTO_DERIVED_FIELDS.has(key)` AND the override set does NOT include `key`.
- A field rendered with an "override" chip iff the override set includes `key` (regardless of whether it's in `AUTO_DERIVED_FIELDS`).
- Otherwise rendered as a plain editable input.

Exported as a readonly array from a small module the webview can import (so the form's chip logic stays in sync with the service's skip-list logic).

---

## 6. BrowserSelection context (StacBrowser surface)

**Where**: `shared/components/src/StacBrowser/BrowserSelectionContext.tsx` (new).

```typescript
interface BrowserSelection {
  selectedItemPath: string | null;
  setSelectedItemPath: (path: string | null) => void;
}

const BrowserSelectionContext = React.createContext<BrowserSelection | null>(null);

// Provider wraps the StacBrowser tree.
// Consumers (ThumbnailPreview, PropertiesSidePanel) use useContext().
```

**Scope**: surface-local. Does NOT go into the global Zustand store. Lifetime matches the StacBrowser component tree.

---

## 7. Entity relationship diagram

```
┌──────────────────────────────────────────────────────┐
│ STAC item.json                                       │
│  properties:                                         │
│    title, bbox, datetime                             │
│    start_datetime ← auto-derived by updateTemporalMetadata
│    end_datetime   ← auto-derived                     │
│    debrief:tags                                      │
│    debrief:platforms                                 │
│    debrief:feature_tags                              │
│    debrief:overrides:       ["start_datetime", …]    │ ← NEW
│    debrief:provenance_log:  [ {…entry…}, … ≤500 ]    │ ← NEW
└───────────┬──────────────────────────────────────────┘
            │
            │ (rotation on overflow)
            ▼
┌──────────────────────────────────────────────────────┐
│ <item_dir>/provenance_log_archive.jsonl              │ ← NEW
│  one PropertiesProvenanceEntry per line              │
│  append-only, atomic write                           │
└──────────────────────────────────────────────────────┘

            ▲                                   ▲
            │                                   │
            │ stacService.updateItemMetadata    │
            │  (single writer,                  │
            │   atomic temp+rename,             │
            │   mtime conflict check)           │
            │                                   │
┌───────────┴───────────────┐     ┌─────────────┴─────┐
│ ActivityPanel (plot open) │     │ StacBrowser       │
│  <PropertiesForm>         │     │  <PropertiesSide> │
│  onCommit → post message  │     │  onCommit → post  │
│  'properties:commit'      │     │  'properties:     │
│                           │     │   commit'         │
└───────────────────────────┘     └───────────────────┘
        ▲                                  ▲
        │ hydrate from item.properties     │
        │                                  │ consumes
┌───────┴────────────┐            ┌────────┴────────────┐
│ hydrate hook:      │            │ BrowserSelection    │
│ plot-open listener │            │ React context       │
│ reads item.json    │            │ (surface-local)     │
└────────────────────┘            └─────────────────────┘

When features change → stacService.updateTemporalMetadata (EDIT):
  1. Read item.properties.debrief:overrides
  2. For each auto-derived field:
     - If in overrides → skip
     - Else if derived value == current value → no-op (idempotent)
     - Else write derived value
  3. Atomic write (same recipe as updateItemMetadata)
```

Session-state (Zustand) is **not** on this diagram — Decision 2 excluded it.

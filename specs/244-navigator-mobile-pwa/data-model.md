# Data Model — Backlog Navigator Mobile Parity (#244)

This feature introduces **no new persistent data shapes**. The
`BACKLOG.md` row format, the `Item` model, and the GitHub commit envelope
are unchanged from #242.

What this feature does add is a small set of **transient UI state shapes**
that govern the mobile layout, the bottom-sheet editor lifecycle, the
full-screen Markdown editor, and the service-worker update prompt. These
all live in TypeScript types under `apps/backlog-navigator/src/types.ts`
and `apps/backlog-navigator/src/state/` — no LinkML, no Pydantic, no
JSON schema files.

---

## Existing entities (unchanged)

The following are referenced but **not modified**:

- **`Item`** (`apps/backlog-navigator/src/types.ts`) — the parsed backlog
  row shape (ID, Category, Description, V/M/A/Total, Complexity, Status,
  Epic, Touched/Live status, Created, Updated). #244 reads it; never
  rewrites its shape.
- **`AppState`** (`apps/backlog-navigator/src/state/`) — the reducer state
  containing `items: Item[]`, `dirtyEdits: Map<id, Edit>`, `phase`,
  `includeCompleted`, search query, sort. #244 adds **no new fields** to
  AppState; mobile components read the same store.
- **GitHub PUT envelope** (`apps/backlog-navigator/src/github/`) — push
  payload shape unchanged (FR-015).

---

## New transient UI state shapes

### `MobileLayoutMode`

```ts
type MobileLayoutMode = 'desktop' | 'mobile';
```

- Source of truth: `useLayoutMode()` hook (research R-4).
- Updated by: `matchMedia('(min-width: 1024px)')` change events.
- Persistence: **none** — recomputed on every render of `<App>`.
- Edge: SSR-safe initial value `'desktop'`.

### `BottomSheetState`

The bottom-sheet editor's state. Lives in **`<EditorOverlayProvider>` React
context** at App root — **not** in `<BottomSheet>` component-local
`useState` (per Review §Issue 1A). The reason: the bottom sheet is rendered
inside the mobile-only subtree, but iPad rotation across the 1024px
breakpoint unmounts that entire subtree; component-local state would be
silently destroyed mid-edit, violating Article I.3 ("no silent failures").
Lifting the state above the layout-mode branch lets the provider catch the
crossing and surface the FR-009 discard-confirm dialog.

```ts
type BottomSheetEditorKind =
  | 'status'
  | 'category'
  | 'epic'
  | 'score-V'
  | 'score-M'
  | 'score-A';

type BottomSheetState =
  | { open: false }
  | {
      open: true;
      itemId: string;                     // which Item the sheet is editing
      editorKind: BottomSheetEditorKind;
      pendingValue: string | number;      // string for enums, number for scores
      dirty: boolean;                     // true once pendingValue !== currentValue
    };
```

State transitions:

```
{ open: false }
    │
    │ user taps a card chip / score
    ▼
{ open: true, dirty: false }
    │                       │
    │ user changes value    │ user dismisses (drag, tap-outside, Cancel)
    ▼                       ▼
{ open: true, dirty: true }    { open: false }     // discard
    │
    │ user taps Save
    ▼
{ open: false } + reducer.dispatch(EDIT)            // commit
```

### `DescriptionEditorState`

The full-screen Markdown editor's state. Same scope as `BottomSheetState`
— lives in the App-level `<EditorOverlayProvider>` context, **not**
component-local (per Review §Issue 1A; same Article I.3 reasoning as
above).

```ts
type DescriptionEditorState =
  | { open: false }
  | {
      open: true;
      itemId: string;
      rawMarkdown: string;        // current textarea contents
      originalMarkdown: string;   // captured at open time, for dirty detection
    };

// Derived: dirty = state.open && state.rawMarkdown !== state.originalMarkdown
```

State transitions:

```
{ open: false }
    │
    │ tap Description region
    ▼
{ open: true, raw === original } → user types → raw !== original (dirty)
    │                                                   │
    │ tap Save                                          │ tap Cancel
    ▼                                                   ▼
{ open: false } + reducer.dispatch(EDIT_DESCRIPTION)    confirm dialog (if dirty)
                                                          │
                                                          ├─ confirm: { open: false }
                                                          └─ cancel: stay open
```

### `ServiceWorkerUpdateState`

Surfaced from `pwa/registerSW.ts`. Lives in a **dedicated** React context
(`PWAUpdateContext`), not the main reducer — the SW lifecycle is
orthogonal to backlog state and shouldn't bloat reducer logs.

```ts
type ServiceWorkerUpdateState =
  | { kind: 'up-to-date' }
  | { kind: 'update-available'; reload: () => Promise<void> }
  | { kind: 'updating' };
```

Transitions:

```
{ up-to-date }
    │
    │ vite-plugin-pwa fires onNeedRefresh
    ▼
{ update-available, reload }
    │
    │ user confirms (taps Reload)
    ▼
{ updating }   // page reloads — state irrelevant after this
```

### `PWAInstallState` (read-only signal)

```ts
type PWAInstallState = 'not-installed' | 'installable' | 'installed';
```

- **`not-installed`**: default; no `beforeinstallprompt` fired and not in standalone display mode.
- **`installable`**: `beforeinstallprompt` event observed (Android Chrome).
- **`installed`**: `window.matchMedia('(display-mode: standalone)').matches` is `true`, OR the `appinstalled` event has fired during this session.

Used only for analytics-style logging (none today) and conditionally
hiding the in-app iOS install help when already installed. Not authoritative
for any UX decision.

---

## Type-residence map

| Type | File | Exported? |
|------|------|-----------|
| `MobileLayoutMode` | (REMOVED — Review §Issue 2A reuses `useIsMobile(1023): boolean` from `@debrief/components`) | n/a |
| `BottomSheetEditorKind` | `src/editors/EditorOverlayContext.ts` | yes |
| `BottomSheetState` | `src/editors/EditorOverlayContext.ts` (consumed via context) | yes |
| `DescriptionEditorState` | `src/editors/EditorOverlayContext.ts` (consumed via context) | yes |
| `EditorOverlayContextValue` | `src/editors/EditorOverlayContext.ts` (Review §Issue 1A — provider value with state + open/close/save/discard actions + dirty-cross-mode handler) | yes |
| `ServiceWorkerUpdateState` | `src/pwa/registerSW.ts` | yes |
| `PWAInstallState` | `src/pwa/registerSW.ts` | yes |

---

## Validation rules

The new state shapes are entirely client-side and have **no boundary** to
GitHub or any external system; they are not validated with Zod. The
existing Zod boundary at `src/github/schemas.ts` continues to validate the
PUT/GET envelope.

Article XV (Strict Type Safety) is satisfied by:
- All shapes exported with concrete types.
- Discriminated unions for state machines (no boolean-tuple states).
- No `any`, no `unknown` without immediate narrowing.
- TypeScript strict mode (already enabled project-wide).

---

## Storage footprint

| Storage | What | Pre-#244 | Post-#244 |
|---------|------|----------|-----------|
| `localStorage` | PAT envelope (#242) | yes | yes (unchanged) |
| `localStorage` | Phase / includeCompleted / search (#242) | yes | yes (unchanged) |
| `IndexedDB` / OPFS | n/a | none | **none** (deliberate per Assumption A-1) |
| Service-worker cache | App shell | none | **new** (vite-plugin-pwa precache, ~120 KB gzipped) |
| Service-worker cache | GitHub responses | none | **none** (networkOnly per R-2) |

No new persistent client storage other than the SW precache.

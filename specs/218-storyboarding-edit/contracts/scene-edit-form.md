# Contract: `SceneEditForm` React component

**File**: `shared/components/src/panels/StoryboardPanel/SceneEditForm.tsx`
**Runtime**: browser (webview / Storybook / web-shell — no VS Code
imports).
**Status**: New in #218.

## Purpose

Render the per-Scene edit surface inline inside the Scene row (when
the row is expanded). One component, four progressive sections,
lazy-mounted on expansion.

## Props

```tsx
export interface SceneEditFormProps {
  readonly sceneId: string;
  readonly title: string;
  readonly description: string | null;
  readonly timestamp: string;                       // ISO-8601; read-only display
  readonly missingData:                             // from data-model.md §3
    | { kind: "ok" }
    | { kind: "missing-features"; ids: readonly string[] }
    | { kind: "out-of-range"; scenario: "before-start" | "after-end" };
  readonly onTitleRenameCommit: (newTitle: string) => void;
  readonly onDescriptionSubmit: (description: string | null) => void;
  readonly onUpdateToCurrent: () => void;
  readonly onDuplicate: () => void;
  readonly onCopyToOther: () => void;
  readonly onDelete: () => void;
  readonly onRefreshThumbnail: () => void;
  readonly onCancel: () => void;                    // closes the form
  /** Optional: renders the markdown preview area. Defaults to
      react-markdown (bundled). Tests inject a stub renderer. */
  readonly renderMarkdown?: (markdown: string) => ReactNode;
}
```

All props `readonly`. No `any` / `unknown`. Component is a pure
function of props + internal UI state (textarea buffer, preview
toggle).

## Layout

```
┌─ Scene row (expanded) ─────────────────────────────────────────┐
│  ▸ [Title inline-editable text input]  [DTG display]  [overflow]│
│  ────────────────────────────────────────────────────────────  │
│  Description                                                   │
│  ┌─ textarea (rows=6, resize=vertical) ─┐  ┌─ preview pane ─┐  │
│  │                                       │  │                 │  │
│  │                                       │  │ rendered md     │  │
│  │                                       │  │                 │  │
│  └───────────────────────────────────────┘  └─────────────────┘  │
│  [Save description]  [Cancel]                                   │
│                                                                │
│  ─ Missing data (conditional — missingData.kind !== "ok") ──   │
│  ⚠ 3 feature IDs no longer resolve:                            │
│    • track-alpha, track-bravo, track-charlie                   │
│  [Update to current]  [Delete]                                 │
│                                                                │
│  ─ Row actions ─────────────────────────────────────────────   │
│  [Update to current] [Duplicate] [Copy to other] [Delete]      │
│  [Refresh thumbnail]                                           │
└────────────────────────────────────────────────────────────────┘
```

## Interaction contracts

### Title inline rename

- Focus title ⇒ becomes editable text input with current title.
- Enter ⇒ `onTitleRenameCommit(trimmed value)`. Empty ⇒ service
  decides (reset to DTG default; per `edit-service.md` contract).
- Escape ⇒ revert to previous title, do not fire callback.
- Blur ⇒ treated as Enter (commit).

### Description edit

- Textarea buffer is local component state; `description` prop is the
  *saved* value. The `Save description` button is disabled when the
  buffer equals the saved value.
- `Save description` ⇒ `onDescriptionSubmit(buffer || null)`.
- `Cancel` ⇒ buffer resets to the `description` prop; close the form.
- No auto-save.
- Markdown preview renders live as the user types, using
  `renderMarkdown` (defaults to `react-markdown` with the CommonMark
  preset — no GFM).

### Missing-data panel (conditional)

- `missingData.kind === "ok"` ⇒ panel not rendered.
- `missingData.kind === "missing-features"` ⇒ render the unresolved
  ID list; both `Update to current` and `Delete` buttons focusable
  (Tab order: Update → Delete).
- `missingData.kind === "out-of-range"` ⇒ render a one-line message
  describing the scenario (e.g., *"Scene timestamp is before the
  current plot time-range start"*); same two buttons.

### Row actions

- Each button calls the matching `on*` prop.
- Disabled state during an in-flight op is the **container's**
  responsibility — the form doesn't hold in-flight state (that
  lives in the playback service via #217's single-flight guard).

## Accessibility contracts

- Root element `role="form"` + `aria-labelledby` pointing to the
  title input id.
- Title input `aria-label="Scene title"`.
- Textarea `aria-label="Scene description"` + `aria-describedby`
  pointing to a visually-hidden instruction about CommonMark.
- Missing-data panel `role="region"` + `aria-labelledby="missing-
  data-heading"`.
- Unresolved ID list is `<ul>` with semantic `<li>` children.
- Each action button carries an `aria-label` distinct from its
  visible text (so screen readers announce the target Scene id
  context).

## Test gates

- **Story**: `WithEditForm` — mounted with `missingData.kind === "ok"`;
  default rendering.
- **Story**: `WithMissingDataRemediation` — mounted with
  `missingData.kind === "missing-features"`; verifies the
  remediation panel.
- **Story**: `WithLongDescription` — mounted with 2000-char
  description; verifies textarea resizes and preview scrolls
  (no overflow).
- Unit test: typing in textarea triggers live preview; Save button
  enables/disables correctly.
- Unit test: Escape on title input reverts buffer; Enter commits.
- Unit test: focus traversal order is title → description textarea
  → Save → Cancel → remediation buttons (if present) → row actions.
- Accessibility test: `@axe-core/playwright` clean on all three
  theme variants.

## Non-goals

- **No markdown toolbar** (bold / italic / link buttons). Analysts
  type markdown syntax directly. Keeps the surface tight.
- **No side-by-side preview toggle**. The preview is always
  visible below the textarea. Saves a UI setting for a feature
  most users won't touch.
- **No autosave / draft persistence**. If the analyst closes the
  form without saving, the buffer is lost. (Re-opening restores
  from `description` prop.)
- **No description length enforcement**. Per spec Assumption; the
  panel scrolls.

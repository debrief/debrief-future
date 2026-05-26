# Contract — `exportStoryboardAsBriefingZip` (VS Code command)

**Surface**: VS Code extension command
**Command ID**: `debrief.storyboard.exportAsBriefingZip`
**Entry**: `apps/vscode/src/commands/exportStoryboardAsBriefingZip.ts`

## Trigger

Registered in the extension `package.json` under
`contributes.commands` with the title
`"Export Storyboard as briefing zip…"`, and surfaced on each Storyboard
overflow menu via `contributes.menus` keyed by the existing
`when` clause used by `debrief.storyboard.rename` and `…delete`.

Spec mapping: FR-001, FR-002.

## Inputs

The command receives one positional argument (passed by VS Code from
the menu invocation):

```ts
interface ExportInvocationArgs {
  storyboardId: string;             // ULID of the StoryboardFeature to export
  documentUri: vscode.Uri;          // active plot document
}
```

No other arguments. The Storyboard is identified unambiguously by its
ULID; the analyst is never asked to disambiguate (FR-002).

## Output

Side-effect: writes one `.zip` file at a user-chosen path. No return value
beyond `Promise<void>`. The path prompt is a `vscode.window.showSaveDialog`
configured with:

| Property | Value |
|----------|-------|
| `defaultUri` | derived from the source plot's parent dir and the Storyboard's `name`: `briefing-{slug(name)}-{YYYYMMDD-HHMMSS}.zip`. |
| `filters` | `{ 'Briefing zip': ['zip'] }` |
| `title` | `"Export Storyboard as briefing zip"` |
| `saveLabel` | `"Export"` |

Spec mapping: FR-003, FR-004.

## Behaviour contract

```ts
async function exportStoryboardAsBriefingZip(
  args: ExportInvocationArgs,
  deps: ExportDeps,
): Promise<void>;

interface ExportDeps {
  readPlot: (uri: vscode.Uri) => Promise<{
    fc: PlotFeatureCollection;
    item: StacItem;
    itemDir: string;                  // resolves thumbnail hrefs
  }>;
  fetchTile: (url: string) => Promise<Uint8Array>;
  showSaveDialog: typeof vscode.window.showSaveDialog;
  showInfo: (msg: string) => void;
  showError: (msg: string) => void;
  writeFile: (uri: vscode.Uri, data: Uint8Array) => Promise<void>;
  readStaticBundle: () => Promise<Map<string, Uint8Array>>;
  // ↑ reads apps/vscode/resources/briefing-renderer-static/** at runtime
}
```

### Steps (in order, must not skip)

1. **Load the plot** via `deps.readPlot(args.documentUri)` (FR-005 — no
   mutation of the source).
2. **Resolve the StoryboardFeature** by `args.storyboardId` from
   `fc.features`. Error if not found.
3. **Compute the scoped FeatureCollection** per data-model rules BR-1–BR-5.
4. **Compute the scoped item.json** per data-model rules BI-1–BI-5.
5. **Prompt for destination** via `deps.showSaveDialog`. If the user
   cancels, return without side-effects (FR-003 explicit).
6. **Compute tile coverage** (see `tile-coverage.md`) and call
   `deps.fetchTile` once per unique `(z, x, y)`. Errors are accumulated;
   a tile failure does not abort the export — the SPA falls back to
   the placeholder for missing tiles (FR-028).
7. **Read the static SPA bundle** via `deps.readStaticBundle()`.
8. **Construct the zip** in memory via `JSZip`:
   - Copy all `assets/**` from the static bundle as-is.
   - Inject inline `<script type="application/json">` blocks into
     `index.html` (see data-model § 4).
   - Add `features.geojson` (pretty-printed for inspection).
   - Add `item.json` (pretty-printed for inspection).
   - Add `scene-thumbnails/scene-{ULID}.png` (and `-sm.png`) by
     copying from `itemDir`. Missing thumbnails are skipped (FR-031 —
     SPA-side fallback).
   - Add `tiles/{z}/{x}/{y}.png` for every successfully fetched tile.
   - Add `tiles/placeholder.png` from the static bundle.
9. **Generate the zip buffer** via `JSZip.generateAsync({ type: 'uint8array' })`.
10. **Write to disk** via `deps.writeFile(destinationUri, buffer)`.
11. **Show success notification** with file path and (optionally) a
    "Reveal in Finder/Explorer" action.

### Error behaviour

| Failure | Surface |
|---------|---------|
| Plot read fails | `deps.showError`; no zip written. |
| StoryboardId not found in plot | `deps.showError("Storyboard not found")`; no zip written. |
| User cancels destination prompt | No-op; no error, no zip. |
| Tile fetch fails (per-tile) | Logged; export proceeds; SPA shows placeholder for missing tiles. |
| Thumbnail file missing | Logged; export proceeds; SPA renders Scene without thumbnail. |
| Zip write fails | `deps.showError`; export aborted. |

The command **never** writes a partial zip. The zip is built entirely
in memory and written atomically at step 10. (Article I.3 — no silent
failures; either the file exists complete or it doesn't.)

### Idempotency

Re-running the command produces a fresh zip with the current Storyboard
state. The destination file is overwritten without prompt if the user
selected an existing path (standard `showSaveDialog` behaviour confirms
overwrite). No partial-write recovery is needed because the build-then-
write-once flow is atomic.

## Test obligations

| Test | Surface | Location |
|------|---------|----------|
| Unit: scope a Storyboard correctly | Pure function from data-model rules | `apps/vscode/src/services/briefingZipExport/scopeStoryboard.test.ts` |
| Unit: scoped `item.json` retains exactly the right assets | Pure function | `…/buildItemJson.test.ts` |
| Unit: tile-coverage computation | Pure function | `…/computeTileCoverage.test.ts` |
| Unit: cancellation returns no-op | Stub `showSaveDialog` → `undefined` | `…/exportStoryboardAsBriefingZip.test.ts` |
| Integration: end-to-end export produces a zip with the expected layout | Stubs for `fetchTile`, `readPlot` | `…/export.integration.test.ts` |
| Playwright: open the resulting zip and play it | See `spa-loading.md` | `apps/briefing-renderer/playwright/tests/briefing-zip-end-to-end.spec.ts` |

## Constitution-check notes

- **IV.1 (services never touch UI)**: this command is part of the
  VS Code app, not a service. The data-shaping helpers (`scopeStoryboard`,
  `buildItemJson`, `computeTileCoverage`) are pure and live under
  `apps/vscode/src/services/briefingZipExport/` so they remain
  independently testable, but they are application logic, not
  cross-frontend services — fine.
- **IV.2 / IV.4 (frontends never persist, persistence-host abstraction)**:
  the export writes a **user-chosen file** at a **user-chosen path** —
  it is not persisting application state. This is functionally a
  "Save As" / "Export to file" operation, equivalent to existing export
  commands (e.g. CSV export of tabular results). The writer
  abstraction governs application-state writes (sidecar / FC / STAC
  assets); briefing-zip export is outside that scope. Confirmed
  compatible with Article IV.4.
- **IX.1 (minimal vetted dependencies)**: introduces `jszip`. Justified
  in research.md R3.
- **XV (strict type safety)**: all command code TypeScript strict; no
  `any` introduced; `JSZip`'s `Uint8Array` outputs are typed at the
  boundary.

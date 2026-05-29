# Integration flow — tolerant playhead import (spec 267)

How a plot with an orphaned saved playhead travels from the file to the screen,
and how the recovery heals on save. All logic below is single-sourced in
`@debrief/session-state`; the two hosts only render the diagnostic.

## The flow, narrated

1. **Load.** The analyst opens a plot (`features.geojson`). The host
   (`apps/vscode/src/commands/openPlot.ts` or `apps/web-shell/src/App.tsx`)
   calls the single shared entry point `hydrateStoreFromFeatures(state, features)`.

2. **Read + severity split.** `read.ts` walks the SYSTEM features. For the
   temporal one it calls `checkTemporalCrossField(temporal)`, which returns a
   **severity-split** verdict (spec 267, replacing spec-261's single violation
   string):

   | Condition | Verdict | Outcome |
   |---|---|---|
   | `start_time > end_time`, or any unparseable timestamp | `fatal` | `read.ts` throws `SystemStateLoadError(kind='cross-field-invariant')` — exactly as 261 |
   | coherent window, `current_time < start_time` | `recoverable-playhead` `{ edge:'start', clampedCurrentTime: start_time }` | clamp |
   | coherent window, `current_time > end_time` | `recoverable-playhead` `{ edge:'end', clampedCurrentTime: end_time }` | clamp |
   | in-range / on a boundary / absent | `ok` | honoured verbatim, no clamp |

3. **Clamp (recoverable only).** For `recoverable-playhead`, `read.ts` builds a
   **typed copy** `{ ...temporal, current_time: clampedCurrentTime }` (no
   mutation of the Zod-parsed object, no `as`-cast — review decision 2A), places
   it in the `SystemStateMap`, and pushes one `PlayheadClampDiagnostic` into the
   `playheadClamps` array it returns. The clamped value is a window boundary's
   **verbatim** ISO string — no reformatting, no float drift.

4. **Explicit return (review 1A).** `read.ts` returns
   `{ map, playheadClamps }`; `hydrateStoreFromFeatures` destructures it,
   hydrates the store from `map` (the playhead reaches `setCurrentTime` already
   in-window, via the unchanged `temporalVariantToSlice` ISO→epoch mapping), and
   **returns** `playheadClamps`. The explicit return — rather than a mutable
   out-param — means a host cannot silently drop the diagnostic.

5. **Notify (never silent — Article I.3, FR-003).** The host inspects the
   returned array. If non-empty it surfaces a **non-blocking** notification:
   - VS Code: `window.showWarningMessage(...)` via `playheadClampNotice.ts`.
   - Web-shell: the existing `LogPanel` transient (`actionResultMessage`), NOT
     the #259 error banner.
   A fatal error took the throw path in step 2 and was surfaced as an error;
   the two paths never collide (the clamp array is empty when a fatal threw).

6. **No dirty, no auto-save (FR-008).** The clamp is in-memory only. The plot is
   not marked modified. There is **no provenance write** — spec-261 ships
   view-state markers without a `provenance` field (261 FR-013), so the
   repeating notification is the durable-until-healed record (revised FR-007).

7. **Heal on save (FR-008, SC-005).** On the analyst's next explicit save,
   `write.ts` persists the store's now-in-window `current_time` through 261's
   existing writer path. Re-opening the plot yields `ok` — no clamp, no
   notification. The loop is closed.

## Why the clamp lives in `read.ts`

`read.ts` is the one place that holds the `feature_id`, the parsed
`TemporalVariant`, and the cross-field verdict together — and once it throws,
the whole map is lost. Recovering the playhead *before* the (now-skipped) throw,
and before the value enters the map, means the downstream slice mapping needs no
change: it converts an already-in-window value.

## Guard rail (US2)

The incoherent-window case (`start_time > end_time`) and unparseable timestamps
stay `fatal` and still throw. When a feature has **both** an incoherent window
**and** an out-of-range `current_time`, the incoherent-window check runs first
(`start > end` is evaluated before the `current_time` branch), so the hard fail
takes precedence and the clamp path is never reached (FR-005).

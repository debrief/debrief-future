## Hook

| Yesterday's behaviour | After #237 |
|---|---|
| Close a plot mid-analysis on Storyboard B. Reopen it tomorrow — you land on Storyboard C, because someone tweaked C ten minutes ago. | Reopen the plot — you land back on Storyboard B, the one you actually had open. |
| Every reopen pays a small re-orientation tax: scan the dropdown, find your Storyboard, click. | The dropdown still works the same. You just don't need it on open. |

## What We're Building

When you have a plot with several Storyboards and you close it halfway through working on one, reopening should put you back where you were — not on whichever Storyboard happened to be edited most recently. That's the whole feature. The dropdown in the side-rail header is unchanged; the only difference is which entry is selected when the plot first opens.

This is a follow-up to #235, which deliberately left active-Storyboard selection ephemeral and noted it "may be revisited if analysts complain about losing selection across sessions." We're acting on that deferral. It's a small change in lines of code and a small change visually — the kind of correctness improvement you only notice if it's missing.

## How It Fits

The shared `StoryboardPanel` React component stays untouched and host-agnostic. Persistence wiring lives in the host mount layers only — `StoryboardPlaybackService` in the VS Code extension and `StoryboardPanelMount` in the web-shell. Each host owns its own selection store behind a shared `ActiveStoryboardSelectionStore` interface in `@debrief/components`: VS Code's adapter wraps `@debrief/config` (file-backed at `~/.config/debrief/config.json` and OS-equivalents); web-shell's adapter wraps `localStorage`. It's the same writer-abstraction shape we used in #236 for STAC writes, applied to per-user UI state instead of plot data.

## Key Decisions

- **`debrief-config` over a schema bump.** Option (a) in the backlog was to add an `is_active` slot to `StoryboardFeature`. Tempting — it lives with the data — but wrong: schema changes are breaking, "which view is open" isn't a property *of* a Feature, and any LinkML edit means regenerating Pydantic, JSON Schema, and TypeScript artefacts plus updating round-trip fixtures. User-config is the lighter touch, and plot files stay byte-identical to today.
- **Per-host robustness, not cross-host sync.** VS Code uses XDG config; web-shell uses `localStorage`. The two stores deliberately don't talk to each other. If you open the same plot in VS Code and in the web-shell, each remembers its own last selection. Cross-host sync would mean a sync service we don't have, an account model we don't have, and a conflict-resolution story we don't need. Per-host is the contract; anything more is out of scope.
- **One JSON-encoded map, not one preference per plot.** Both adapters store a single container value: a stringified `{ [itemPath]: storyboardId }`. Partly forced — `@debrief/config`'s `PreferenceValue` is scalar-only — but it also keeps writes atomic against last-writer-wins and the preference namespace clean.
- **The shared panel stays unchanged.** All persistence is at the mount layer. `StoryboardPanel` keeps its current `activeStoryboardId` / `onActiveStoryboardChange` props and stays portable to other hosts (Jupyter, Loader, Storybook) without forcing them to bring a store along.
- **Silent on success and on failure.** No restoration banner — if a reader notices the new behaviour, the feature has failed at being invisible. Read failures fall back to today's default-selection rule; write failures degrade to session-only state; stale IDs (Storyboard deleted elsewhere) self-heal on the next override.

## What We're Building

Two small TypeScript enums — `DisplayMode` and `PlaybackState` — have been quietly drifting across the codebase. The components package spells one of them `full | trail`; the session-state store spells the same concept `normal | snailTrail`. The components package accepts two playback states; session-state carries three. Wherever those two worlds meet — four places in the VS Code extension, one in the web shell — inline ternaries like `m === 'snailTrail' ? 'trail' : 'full'` paper over the gap.

This feature collapses both enums into a single pair generated from the LinkML master schema. Four hand-typed declarations go away. Eight translator sites go away. One vocabulary per concept, generated once, consumed everywhere.

## How It Fits

This is the third in a short run of LinkML consolidations, following #203 (spatial types) and #204 (RawGeoJSONFeature). They're all driven by Epic E11 — the audit programme for non-LinkML type declarations tracked under backlog #206. Each one removes a schema-integrity drift vector, which is Article II of the project constitution. The LinkML master schema stays the single source of truth across Python, TypeScript, and JSON Schema; the derived types stay trustworthy; and changes to the data model stop needing to be threaded by hand through every consumer.

`TemporalSlice.playbackState` and `.displayMode` are on the critical path for every time-controller interaction, every webview map render, and every session-state persistence cycle. Getting these two right earns back a lot of reviewer attention over the next few months.

## Key Decisions

- **Rename `DisplayModeEnum` to the component vocabulary, not the session-state one.** Today's LinkML values are `normal | snailTrail`; after this change they're `full | trail`. That matches the labels users already see on the `DisplayModeToggle` buttons, so the enum identifier finally agrees with what you read on the screen. The losing vocabulary was internal-only — it never reached the UI.
- **Widen the component surface to the three-state `PlaybackState` (`stopped | playing | paused`).** Session-state has always had three states; components only knew two because a host-view translator was throwing one away. The rendering rule after the change: `stopped` renders identically to `paused` (static playhead, play button enabled, pause button disabled). That rule lives in the LinkML enum description, so an IDE hover surfaces it on every call site.
- **Narrow the generated TS fields with a template-literal post-processing rule.** The LinkML TS generator emits `TemporalSlice.playbackState: string` today; we extend `shared/schemas/scripts/generate.py` to inject `export type PlaybackState = \`${PlaybackStateEnum}\`` and narrow the slice fields to use it. This mirrors the precedent Feature 201 established for `PointShape` — same mechanism, no generator upgrade, no `as` casts at migration sites (Article XV stays clean).
- **Ship as a single atomic PR.** One LinkML edit, one regeneration diff, one generator rule, four declarations deleted, eight translator sites deleted, around 30 import-only renames across four workspaces, five schema-adherence fixtures plus two invalid fixtures, one ADR entry. No installed-base JSON carries the legacy values (verified by grep), so no staged deprecation is owed.
- **Nothing changes for users.** No visible UI change, no behaviour change, no message-shape change beyond values that already translated one-for-one. This is a tax we're paying down so the next change to these types costs less.

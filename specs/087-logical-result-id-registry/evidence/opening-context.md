## What We're Building

When an analyst runs a bearing-time plot for Track A, they get a result file -- say
`bt_plot_001_v1.png`. When they tweak a parameter and re-run, they get
`bt_plot_001_v2.png`. The tool knows these are conceptually the same output. But nothing
else in the system does. The result panel showing that chart has no way to know a newer
version exists unless it goes scanning the filesystem.

The Logical Result ID Registry (#087) solves this by maintaining a live map of stable
logical IDs to their current versioned files. A tool declares "this output is
`bt_plot_001`", and the registry tracks which version is current. When a re-run produces
v2, the registry updates the mapping and emits a change event. Any view bound to that
logical ID gets notified. No polling, no scanning, no coupling between the tool that
produces results and the view that displays them.

## How It Fits

This is one of five pieces in the Results Visualization epic (E04). The chart renderer
(#085) and results panel (#086) handle display. The custom editor provider (#088) handles
VS Code integration. Auto-refresh (#089) handles the view-level response when results
change. The registry sits in the middle -- it provides the indirection layer that decouples
tool execution from result display. Without it, every view would need to know how tools
version their outputs. With it, views just subscribe to a logical ID and get told when
something changes. The registry builds on the Log Recording Service (#071), observing
`RecordResult` entries rather than hooking into tool execution directly, which keeps the
separation of concerns clean.

## Key Decisions

- **Lives in `@debrief/session-state` alongside the Log Service.** Same package, same
  lifecycle. The registry observes Log entries as they are recorded -- no new inter-package
  dependencies.
- **Observes, does not modify.** The registry watches `RecordResult` events from the Log
  Service rather than requiring changes to LogService internals. This was a deliberate
  choice to avoid coupling the two features.
- **Pure in-memory, reconstructed each session.** On plot load, the registry hydrates from
  STAC asset metadata (`debrief:resultId` and `debrief:version` fields). It picks the
  highest version for each logical ID. No persistent state to manage or migrate.
- **Callback-based subscriptions.** Views subscribe to specific result IDs or to all
  changes. Unsubscribing cleans up the callback. This is the API that auto-refresh (#089)
  will consume.
- **Synchronous operations.** All registry reads and writes are synchronous. The JavaScript
  event loop guarantees ordering, so rapid successive updates for the same result ID produce
  correctly sequenced change events. No need for locks or queues.
- **Never overwrites artifacts.** Each re-run creates a new versioned file. The registry
  just updates which version is current. This preserves full history -- you can always go
  back and see what v1 looked like.
- **Result IDs are scoped per-plot.** No cross-plot collisions. When a plot is closed, the
  registry clears all mappings and subscriptions.

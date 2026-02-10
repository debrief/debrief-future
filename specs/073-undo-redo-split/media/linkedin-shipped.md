Just shipped a split in how undo/redo works: Ctrl+Z now only reverses UI display state. Data changes—plot loads, tool execution, file saves—stay put and get tracked by the Log Recording Service instead.

This matters because analysts need to navigate what they're looking at without accidentally erasing the work they just did. You can step back through five view states to compare two map positions, and the analysis results behind them don't vanish.

The work was untangling three categories of state that had been mixed together: ephemeral (never tracked), persistent-but-not-undoable (logged but not undone), and UI-state (undone only). Added an explicit UNDO_TRACKED_FIELDS set. 313 tests, zero regressions.

Phase 3 of the PROV Logging Implementation epic—tightening how data mutations flow through the system.

Read more: [Future Debrief blog](https://debrief.github.io)

#FutureDebrief #StateManagement #MaritimeAnalysis

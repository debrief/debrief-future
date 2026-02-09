Pressing Ctrl+Z in an analysis tool shouldn't wipe out a calculation you just ran. But when undo treats viewport pans and tool results as the same kind of state change, that's exactly what can happen.

We're splitting Future Debrief's undo system: Ctrl+Z handles display state only (map position, time settings, track visibility), while tool execution results move to a proper provenance log with PROV-aligned entries. The change touches ~30 lines across 4 files -- the hard work was building the Log Recording Service first.

https://debrief.github.io/blog/2026/02/09/planning-split-undo-redo

#FutureDebrief #MaritimeAnalysis #Provenance

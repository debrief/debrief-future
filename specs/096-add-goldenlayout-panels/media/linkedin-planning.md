Every analyst arranges their workspace differently depending on the task. More map space for spatial work, chart and map side-by-side for temporal comparison, second monitor for an expanded view. Fixed layouts don't accommodate that.

We're replacing Future Debrief's web-shell flexbox layout with GoldenLayout v2 -- adding resize, drag-and-dock, tabbed panels, and pop-out windows. The five existing panels slot into a default layout that mirrors the current design, so nothing breaks. But now you can rearrange everything to suit the analysis at hand, and your layout persists between sessions.

The interesting constraint: pop-out panels live in separate browser windows with their own JavaScript context. We're using `shared-zustand` with BroadcastChannel to sync state across windows at sub-5ms latency. Selection, time position, and feature visibility stay in sync. Undo history stays window-local.

https://debrief.github.io/blog/2026/02/14/planning-goldenlayout-panel-management

#FutureDebrief #MaritimeAnalysis #OpenSource

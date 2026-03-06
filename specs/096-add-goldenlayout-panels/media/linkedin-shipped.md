Shipped a VS Code-like panel workspace for Future Debrief -- and the interesting part isn't the panels, it's the decoupling pattern behind them.

We replaced the web-shell's fixed flexbox layout with GoldenLayout v2. Five panels (Navigation, Activity, Log, Map, Chart) are now resizable, draggable, dockable, and tabbable. Analysts can rearrange everything to suit the task, and layouts persist to localStorage between sessions. A "Reset Layout" action restores defaults when needed.

The architecture decision that made this clean: a PanelContext pattern that decouples panel content from layout infrastructure. Panel wrappers don't know they're inside GoldenLayout. They receive state through React context and render independently. Swap the layout library tomorrow -- panel components don't change.

A custom React bridge (~100 lines) uses `createRoot` per panel with a reactive re-rendering wrapper, since GoldenLayout has no native React support. An extensible Panel Registry means adding a new panel type is a single registration call -- no infrastructure changes.

17 files, zero modifications to existing shared components. The map, charts, time controller, drawing tools, and layers all work exactly as before -- just in a workspace analysts can finally make their own.

[Read the full post: LINK]

#FutureDebrief #MaritimeAnalysis #OpenSource #GoldenLayout #React

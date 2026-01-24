Move the time slider, and the map updates. Select a vessel, and the properties panel shows its data. Run a Python analysis script, and it knows what you're looking at.

That coordination is harder than it sounds. This week I'm building session state management for the Debrief VS Code extension — centralized state that tracks where you are in time, what you're viewing on the map, and what's selected. UI components subscribe to the parts they care about. Python tools query and update state through MCP.

The tricky bits: undo/redo needs to exclude ephemeral state like "playback is running." Rapid pan/zoom generates lots of viewport changes that need throttling before hitting the undo stack. And we're choosing between referencing external data (smaller files, fragile links) or embedding it (portable, but larger).

Using Zustand for state management — its vanilla store works in VS Code's extension context — and Zundo for undo history with a 50-step limit.

[Link to full post]

#FutureDebrief #MaritimeAnalysis #OpenSource

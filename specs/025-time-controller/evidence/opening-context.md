## What We're Building

Maritime analysts spend hours examining how tracks evolve through time — where vessels were at specific moments, how their movements relate to each other, when closest points of approach occurred. Currently, our map shows track data statically. You see all positions at once, which is useful for some analysis but misses the temporal story entirely.

We're adding a time controller component to the VS Code extension sidebar. It provides a scrubber for jumping to any point in your loaded time range, play/pause controls for animated playback, and speed options (1x through 8x) for scanning through long operational periods quickly.

## How It Fits

The time controller is part of our shared React component library, which means it'll work in the VS Code extension now and later in the Electron loader app. It follows the same pattern as our other components: controlled props for state management, no internal persistence, and full offline capability.

The map component will listen for time changes and render track positions accordingly. All tracks update together — we're deliberately keeping this simple rather than supporting per-track time controls.

## Key Decisions

- **Sidebar panel, not map overlay**: Keeps the controller visible and accessible without obscuring the map. Standard VS Code interaction patterns.

- **Keyboard shortcuts when focused**: Space for play/pause, arrows for scrubbing. Only active when the panel has focus, so no conflicts with VS Code keybindings.

- **No step buttons**: The scrubber plus keyboard arrows provides enough precision for frame-by-frame navigation. Keeps the UI clean.

- **requestAnimationFrame for animation**: Synchronizes with the browser refresh rate, avoids additional dependencies, and handles speed multipliers naturally.

- **Adaptive time display**: Shows HH:MM:SS for sub-day ranges, includes date prefix for multi-day operations.

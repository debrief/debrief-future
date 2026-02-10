Three bugs, one root cause.

The Debrief VS Code extension stopped updating the map when the time slider moved, lost its location marker, and rendered trail mode as a blank canvas. All three broke simultaneously after recent feature work. Tracing the message chain across six handoff points -- from TimeController through Zustand session state, across a postMessage boundary, into the shared React rendering layer -- every link was intact. The data was flowing. The problem was at the very end: track timestamps arrived as ISO 8601 strings, but the binary search expected epoch milliseconds. JavaScript compared them silently, returned wrong indices, and three features failed for the same reason.

The fix is a one-line type conversion at the bridge between STAC data and shared components. That's where the type boundary lives, that's where it belongs.

A fourth bug -- tools not offered on selection -- turned out to be a callback registered only for new panels, not reused ones. Separate cause, separate fix.

[Read the full planning post](https://debrief.github.io/future/planning-fix-vscode-extension-bugs/)

#FutureDebrief #MaritimeAnalysis #VSCode

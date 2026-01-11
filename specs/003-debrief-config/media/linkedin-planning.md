Most Node.js XDG libraries get macOS paths wrong.

Building a config service for Future Debrief that needs to share state between Python services and an Electron UI. Both read and write the same JSON file — when you register a STAC catalog from Python, it appears in the loader dropdown immediately.

Python's `platformdirs` handles cross-platform paths correctly. The popular Node.js option (`env-paths`) uses `~/Library/Preferences` on macOS instead of `~/Library/Application Support`. Twenty lines of manual path resolution was simpler than working around that mismatch.

Small piece of infrastructure, but foundational. Everything that needs to remember settings or discover available stores will use this.

https://github.com/debrief/debrief-future/tree/main/specs/003-debrief-config

#FutureDebrief #MaritimeAnalysis #OpenSource

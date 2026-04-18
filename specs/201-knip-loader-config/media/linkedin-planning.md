Our unused-code scanner has been reporting twelve dead modules in the Electron loader. Eleven of them aren't dead — knip just can't see where an Electron app starts, so the main process looks like an island with no bridge. The twelfth one is actually dead.

That twelfth finding matters. It's the reason to fix the tool instead of silencing it.

Next up for Future Debrief: a fifteen-line knip config at the repo root declaring the three Electron entry points (main, preload, renderer). The eleven false positives disappear. The real orphan — an unused auto-updater module — stays flagged, because we want the next contributor to see it and make a call: delete it, or wire it up.

The discipline worth naming: verify before silencing. An ignore list would have made the scanner output clean and the codebase quietly dishonest. We'd rather the tool tell us the truth.

Small hygiene work. Visible once the noise clears.

Read the plan: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource

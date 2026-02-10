When an analysis tool writes files to your STAC catalog, where do those files show up in the UI? Until now, nowhere.

We're building a shared React tree view that renders the STAC catalog's directory structure as a browsable sidebar panel. Expand catalogs, see items and assets, double-click to open a plot. The component is filesystem-agnostic -- it accepts an adapter, so the same tree works against Node.js in VS Code and an in-memory filesystem in the browser demo.

The part I find most interesting: highlight propagation. After a snapshot operation creates new files, those paths light up in the tree. If they're inside a collapsed branch, the ancestor node shows an indicator too. You can scan a large catalog and immediately spot where new work landed without expanding every folder.

This sits on top of the provenance infrastructure from our last three features -- PROV schemas, log recording, and snapshots. The tree is how analysts actually see that machinery working.

[Read more ->](https://debrief.github.io/debrief-future/planning/2026/02/10/planning-stac-file-tree.html)

#FutureDebrief #MaritimeAnalysis #OpenSource

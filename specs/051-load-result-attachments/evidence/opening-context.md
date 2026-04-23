## What We're Building

When an analyst runs a range-bearing calculation or other analysis tool in VS Code, the results get saved to the plot's STAC item — in the assets folder alongside the plot data. But right now, those results only appear in the Attachments dropdown while the session is active. Close the file and reopen it, and they disappear.

This feature reconnects that gap. When a plot loads, we'll scan its STAC item for existing result files and automatically populate the Attachments dropdown. The analyst sees all their previous calculations without re-running anything.

It's a small change with real impact: results stop being ephemeral, and analysis sessions become truly persistent.

## How It Fits

We already have the pieces in place. When a plot opens, we fetch its STAC item — the canonical record of everything associated with that plot. Those result files are already stored there, labeled with metadata roles. The Attachments component can already render them. We're filling in the middle step: extraction.

The work connects three parts of the system:
- **stacService** — knows how to read STAC items and their assets
- **activityPanelView** — handles plot data flow to the UI
- **Attachments component** — already renders files correctly

No UI changes. No new patterns. Just scanning what's already there and feeding it upstream.

## Key Decisions

**Identification by STAC roles first.** When tools save results, they tag them with `roles: ["result"]` in the asset metadata. We'll use that as the primary signal. Clean. Explicit. Schema-backed.

**Filename pattern fallback.** For results that don't have metadata (perhaps from earlier versions or external tools), we'll look for file extensions like `.geojson`, `.csv`, `.json` in the assets. Belt and suspenders.

**Load on plot activation.** The results arrive as part of the plot data packet sent to the activity panel, same timing as everything else. No separate scan. No race conditions.

**Keep the interface consistent.** Results use the same `AssociatedFile` interface as session-created results. One code path. Same rendering logic.

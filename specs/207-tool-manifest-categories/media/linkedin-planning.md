The coloured icons in the Debrief Log Panel exist so an analyst can scan the provenance of an analysis at a glance — import, styling, calculation, filter, snapshot. The glance only works if the colour is right.

Right now it's maintained by hand in a list of about sixteen tool IDs in the UI component library. Anything not on the list falls back to neutral grey, and every new tool someone adds quietly erodes the signal until a human remembers to edit the list.

The next piece of work moves that declaration to the point where the tool is registered. LinkML owns the category vocabulary, the existing MCP pipeline carries it out, and the Log Panel looks it up at render time. New tools — first-party or contributed — get the right colour without anyone editing the UI.

A couple of decisions are still open: whether the hierarchical and visual categories should coexist in the manifest, and whether destructive operations deserve their own bucket rather than being folded into "styling".

Planning post with the details:
https://debrief.github.io/2026/04/22/planning-tool-manifest-lookup-for-log-panel-categories.html

#FutureDebrief #MaritimeAnalysis #OpenSource

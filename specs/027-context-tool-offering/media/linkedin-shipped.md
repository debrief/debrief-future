Analysis tools now appear based on what you've selected. Select two tracks, see range calculations. Select one track and one point, different tools appear.

The implementation is a TypeScript library that matches tool requirements to selections. Each tool declares what it needs ("exactly 2 tracks" or "at least 1 track") using LinkML schemas that generate both TypeScript types and JSON Schema. When requirements don't match, the system explains why: "Requires at least 2 tracks (1 selected)."

We verified this without building a full UI. Unit tests covered the matching logic (38 tests). A Storybook harness with Playwright automation proved the interactions work. VS Code integration comes next, but the hard part—matching and explanations—is done.

Read more: https://debrief.github.io/debrief-future/specs/027-context-tool-offering/media/shipped-post.html

#FutureDebrief #MaritimeAnalysis #TypeScript

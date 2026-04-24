## What We're Building

Every VS Code webview in Debrief needs form controls, data tables, layout primitives, and icons that look and feel native to VS Code. Rather than each developer making their own choice (or worse, rolling their own), we're documenting a single standard: [vscrui](https://github.com/nicolo-ribaudo/vscrui), a React component library purpose-built for VS Code webviews.

This is a documentation-only feature. No code changes, no new dependencies to install. We're writing the reference material so that anyone building a Debrief webview panel -- whether it's the STAC catalog browser, the time controller, or something we haven't thought of yet -- knows exactly which components to reach for and how to use them.

The documentation will live at `shared/components/vscrui.md` and be cross-referenced from `ARCHITECTURE.md`, so it's findable from the two places developers are most likely to look.

## How It Fits

Debrief's architecture follows a "thick services, thin frontends" principle. The VS Code extension is one of those thin frontends, and its webview panels are where analysts interact with plots, timelines, and analysis results. Having a consistent component library means panels built by different people at different times will still feel like one coherent application.

vscrui sits at the shared component layer of our architecture. It doesn't replace Leaflet for maps or our custom timeline rendering -- it handles the structural and interactive elements that surround them: dropdowns, checkboxes, data grids, badges, toolbars.

## Key Decisions

- **vscrui over the VS Code Webview UI Toolkit.** Microsoft deprecated their official toolkit in favour of web components that don't integrate well with React. vscrui is React-native, actively maintained, and covers the same ground.
- **Bundled, not fetched.** vscrui ships as an npm package bundled into the extension. No CDN calls, no network dependency. This matters for Debrief's offline-by-default principle -- analysts working on classified networks or at sea can't rely on external resources.
- **Documentation, not enforcement.** We're writing a reference and conventions guide, not adding linting rules or build-time checks. At this stage of the project, clear documentation is more valuable than tooling that slows people down.
- **Organised by purpose.** The docs group components into five categories: form elements, display, layout, interactive, and icons. This mirrors how developers actually think when building a panel -- "I need a dropdown" not "I need the `VSCodeDropdown` component."

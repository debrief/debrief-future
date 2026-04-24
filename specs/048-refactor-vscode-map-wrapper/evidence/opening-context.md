## What We're Building

The VS Code map panel currently contains about 2000 lines of vanilla TypeScript and Leaflet code. All of it—track rendering, selection handling, temporal filtering—lives inside the VS Code webview where it's difficult to test.

We're refactoring this to a thin wrapper pattern: a ~200 line React component that handles only VS Code-specific concerns (message passing, state persistence) while delegating all map functionality to our shared `@debrief/components/MapView`. The same component that powers our Storybook demos will power the extension.

## How It Fits

This follows the "thick services, thin frontends" principle from our constitution. The TimeController panel already works this way—it's a thin wrapper around the shared component, and we can test temporal playback without spinning up VS Code.

Once the map follows the same pattern, developers can run `npm test` in the shared components package and verify map behaviour instantly. Storybook becomes the development environment for map features. VS Code becomes just another host.

## Key Decisions

- **React in the webview**: The TimeController already uses React and `createRoot`. We'll follow the same pattern rather than introducing a different approach for the map.

- **Preserve the message protocol**: The extension backend already speaks a well-defined message protocol (`loadPlot`, `setSelection`, `setCurrentTime`, etc.). We'll keep these messages exactly as they are—the wrapper just transforms them into React props.

- **Gradual migration**: We'll create the new wrapper alongside the existing code, add a feature flag to switch between them, and cut over only after visual regression testing confirms identical behaviour.

- **Deprecate the renderers**: Once the wrapper is validated, we'll deprecate `trackRenderer.ts`, `locationRenderer.ts`, `selectionManager.ts`, and the other vanilla Leaflet code. About 1800 lines of code that no longer need to exist.

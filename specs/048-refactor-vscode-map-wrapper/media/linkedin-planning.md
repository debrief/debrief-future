# LinkedIn Planning Summary

---

Testing map rendering in a VS Code extension is painful. You need the extension host, the webview, the whole environment.

We're about to fix that. The VS Code map panel—2000 lines of vanilla Leaflet code—is becoming a thin wrapper around our shared React component. Same component that runs in Storybook, now powering the extension.

The TimeController already works this way. Soon the map will too. Developers run `npm test` and get instant feedback on map behaviour. No VS Code required.

About 1800 lines of code become unnecessary. The shared component becomes the single source of truth.

[Read the full planning post →]

#FutureDebrief #OpenSource #DeveloperExperience

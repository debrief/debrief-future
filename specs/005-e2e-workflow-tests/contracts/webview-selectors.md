# Contract: Webview Selectors for E2E Tests

**Revised**: 2026-03-06 — Updated for dual-platform strategy

## Purpose

Defines the DOM selectors that E2E tests use to interact with Debrief components. Both test surfaces (web-shell and VS Code E2E) target the same underlying React/Leaflet components, but the VS Code E2E tests must navigate through VS Code's iframe hierarchy to reach them.

## Web-Shell Selectors (direct access)

Web-shell tests access Debrief components directly via standard Playwright locators. The "Debrief Webview Selectors" below apply without iframe traversal.

## VS Code Chrome Selectors (openvscode-server / code-server managed)

These selectors target VS Code's own UI and may change between server versions. Keep interactions minimal.

| Element | Selector | Used For |
|---------|----------|----------|
| Command palette trigger | `Ctrl+Shift+P` (keyboard) | Opening command palette |
| Command input | `.quick-input-box input` | Typing commands |
| File explorer | `.explorer-folders-view` | Navigating to files |
| Notification area | `.notifications-toasts` | Reading error/success messages |
| Panel area | `.panel` | Verifying panels are open |
| Webview container | `iframe.webview.ready` | First iframe level |
| Webview content | `#active-frame` | Second iframe level |

## Debrief Webview Selectors (project controlled)

These selectors target Debrief components and are stable — they are owned by this project.

### Map Panel

Based on existing selectors from `apps/web-shell/playwright/tests/`:

| Element | Selector | Used For |
|---------|----------|----------|
| Map container | `.leaflet-container` | Verifying map is rendered |
| Track layer | `.leaflet-interactive` (polyline) | Counting/clicking tracks |
| Selected track | `.track--selected` | Verifying selection state |
| Map fit button | `[data-testid="fit-window"]` | Triggering fit-to-bounds |

### Catalog Panel

| Element | Selector | Used For |
|---------|----------|----------|
| Catalog overview | `.catalog-overview` | Verifying catalog panel is rendered |
| Plot entry | `.catalog-plot-item` | Listing/clicking plots |
| Feature count | `.catalog-feature-count` | Reading feature count per plot |
| Provenance link | `.provenance-source` | Verifying provenance chain |

### Tool UI

| Element | Selector | Used For |
|---------|----------|----------|
| Analysis results | `.web-shell--analysis` | Verifying tool output is displayed |
| Tool result entry | `.tool-result-item` | Listing analysis results |
| Error display | `.error-notification` | Reading error messages |

## Selector Stability Notes

- **Debrief selectors** use semantic class names and `data-testid` attributes. These are part of the component contract and should not change without updating tests.
- **VS Code selectors** target stable structural elements (`.quick-input-box`, `.notifications-toasts`) that have remained consistent across VS Code versions, but they are not guaranteed. Minimise VS Code chrome interactions.
- **Leaflet selectors** (`.leaflet-container`, `.leaflet-interactive`) are from the Leaflet library and are stable across versions.

# Research: Stakeholder Demo UI

**Feature**: 189-stakeholder-demo-ui
**Date**: 2026-04-14

## 1. No-build-step strategy

**Decision**: Use Babel standalone to transform inline JSX in the browser. Load React and ReactDOM from a CDN as ES modules. Import `@debrief/components` as a pre-built ESM served from the same origin as the demo HTML.

**Rationale**:
- FR-001 mandates no build step for the demo. Babel standalone is the canonical way to transform JSX at runtime; its size cost (~1 MB) is acceptable for a stakeholder demo served offline.
- React via esm.sh is the established pattern for no-build React apps and matches the E10 prototype's approach.
- `@debrief/components` is a TypeScript workspace package that already produces an ESM build for consumers (VS Code extension, web-shell). The demo piggybacks on that existing build output — no new build pipeline is introduced.
- This keeps the demo author's loop to "edit HTML/JSX → reload browser" with zero tooling overhead.

**Alternatives considered**:
- **Vite/esbuild dev server**: Fast and ergonomic but violates FR-001.
- **Reimplement the `generateCql2` + `filterByCql2Json` logic inline**: Duplicates code, risks drift, violates V (Extensibility) by not reusing the shared library.
- **Hand-write vanilla JS DOM manipulation (no React)**: Possible but significantly more code for chip rendering and grid updates. React's ergonomics earn their CDN weight here.

## 2. Chip colour palette

**Decision**: Map chip `filterType` to colours per the E10 prototype convention, expressed as CSS custom properties in `styles.css`:

```css
:root {
  --chip-nationality: #2E6FDB; /* blue */
  --chip-vessel:      #3FA653; /* green */
  --chip-exercise:    #8B4FC7; /* purple */
  --chip-tag:         #E5A63C; /* amber */
  --chip-year:        #D96857; /* coral */
  --chip-domain:      #3BA7A1; /* teal */
}
```

**Rationale**:
- Matches the visual convention established in the E10 epic's section 7.
- CSS custom properties allow palette tweaks without touching component code.
- Hex values are specific enough to reproduce consistently but not precious — stakeholders may ask for adjustments during demo review and these are one-line changes.

**Alternatives considered**:
- Tailwind utility classes: too much dependency weight for this demo.
- Pulling from a design system: premature — this is an unopinionated playground.

## 3. Fixture + catalog sourcing at runtime

**Decision**: Copy (not symlink) `preview/workspace/samples/local-store/` and `@debrief/components/.../fixtures/responses.json` into `apps/nl-demo/data/` at deploy time via a small shell script invoked from the app's `package.json`. The copy is an explicit build step — but it runs outside the demo's own code path, so FR-001 (no build step for the demo itself) is preserved.

**Rationale**:
- A static site cannot reach outside its served root, so the catalog must live under the demo's directory.
- Copying rather than symlinking keeps deployment artefacts self-contained — the demo can be zipped and served anywhere without repo context.
- The copy step is documented in the README.md and run manually at "release time"; it is not part of the author feedback loop.

**Alternatives considered**:
- Symlink: works locally, breaks when the demo is deployed to a remote host.
- Serve from a small backend: violates the "static directory, no backend" promise of FR-016.

## 4. State management

**Decision**: Plain React hooks (`useState`, `useEffect`, `useMemo`). No Redux, no Zustand, no Context beyond what's needed for chip-removal callbacks.

**Rationale**:
- The demo has a single screen with a small state footprint: query string, active chips, filtered plots, UI state enum. Hooks handle this trivially.
- Adding a state library for this scope is over-engineering.

**Alternatives considered**:
- Zustand (already in the tech stack for web-shell): unnecessary — no cross-tree state sharing.

## 5. Off-corpus banner source of example phrases

**Decision**: At page load, read the fixture corpus JSON, extract the list of canonicalised phrases, and pick 3 at random (or a fixed curated subset) to display in the banner when an off-corpus phrase is submitted.

**Rationale**:
- Keeps the example list in sync with 188's corpus automatically — no manual duplication.
- A curated subset is preferable to pure random for demo consistency; use the first 3 phrases of the corpus as the canonical examples.

**Alternatives considered**:
- Hardcoded list: drifts the moment 188's corpus changes.
- User-provided list via query param: overengineered for a stakeholder demo.

## 6. Debouncing / Enter handling

**Decision**: Submit on Enter only (no debounced live-search). Cancel any in-flight render work if a new submission arrives via AbortSignal or stale-state guards in the effect.

**Rationale**:
- Filter evaluation against 72 plots + chip rendering is fast enough that live-search would work — but Enter-to-submit matches the E10 epic's spec and keeps the demo feeling deliberate rather than frantic.
- Stale-state guards handle the "type fast + hit Enter repeatedly" edge case from the spec.

## 7. Playwright test hosting

**Decision**: Serve the `apps/nl-demo/` directory with `python -m http.server` (or `pnpm dlx serve`) from within the Playwright test's setup hook, the same way `apps/web-shell` Playwright tests spin up their dev server.

**Rationale**:
- Matches existing monorepo E2E patterns.
- Keeps the test self-contained; CI doesn't need a running demo environment.

## 8. Deployment target for stakeholder demo sessions

**Decision**: Extend the existing `demo/` Docker image to serve the built `apps/nl-demo/` directory at a new path (e.g. `/nl-demo/`). Pin deployment to the same Fly.io instance that hosts the XFCE desktop demo.

**Rationale**:
- One URL, one host, one deployment story. Stakeholders already have `debrief-demo.fly.dev` bookmarked from earlier demos.
- Fly.io infrastructure is already wired up with CI; no new deployment pipeline needed.

**Alternatives considered**:
- GitHub Pages: fast and free, but fragments the demo URL story. Could be done later if needed.
- Standalone Fly.io app: overkill for a sibling static directory.

## 9. Prototype-palette fidelity

**Decision**: Adopt the E10 prototype's visual conventions verbatim (chip colours, card layout, empty-state copy) rather than designing fresh. Treat the prototype as a fixture — deviations require justification at review time.

**Rationale**:
- The prototype was stakeholder-tested; its visual language is known to land well.
- 189 is a playground, not a product UI — time invested in novel design is time not invested in other items of the epic.

## Open items (resolved at implementation, not blockers)

- Specific React/Babel CDN versions (pin at implementation time, test the pinned versions once).
- Exact catalog JSON structure served to the demo (should match `preview/workspace/samples/local-store/` 1:1 — but confirm at implementation time in case the format evolves).
- Whether to include a simple "Copy link" button that serialises the active chips into a URL hash for demo reproducibility. Nice-to-have, not required by any FR.

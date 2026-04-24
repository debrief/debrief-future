# Implementation Plan: Stakeholder Demo UI for NL Catalog Search

**Branch**: `189-stakeholder-demo-ui` | **Date**: 2026-04-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/189-stakeholder-demo-ui/spec.md`

## Summary

Ship a static HTML page (`apps/nl-demo/`) that loads React + Babel from CDN, fetches the sample catalog and 188's hand-authored fixture corpus as JSON, and wires 188's `generateCql2` through a recorded-response transport to drive a chip bar and card grid. The demo runs entirely offline after page load, matches the E10 prototype visual language, and serves as the stakeholder-facing deliverable for the NL-assisted discovery epic.

No live-LLM concerns, no credentials, no backend. The demo is a pure consumer of 188's published library artefacts plus the existing sample catalog. A separate follow-up item (#190 — Live LLM Transport) will later swap the transport for real queries without touching this UI.

## Technical Context

**Language/Version**: TypeScript 5.x authored source, compiled to ES modules by `@debrief/components` build. Babel standalone transforms the demo's own JSX inline in the browser (so demo authors never run a bundler).
**Primary Dependencies**:
- `@debrief/components` — source of `generateCql2`, `createRecordedLLMClient`, `filterByCql2Json`, `LozengeSeed`, `PROPERTY_MAP` (all merged via #188 + #185).
- React 18.x and ReactDOM 18.x from esm.sh CDN.
- Babel standalone from cdnjs for in-browser JSX transform.

**Storage**: Read-only static JSON — `preview/workspace/samples/local-store/catalog.json` + items + 188's `responses.json` fixture file, all copied or served from `apps/nl-demo/data/`.

**Testing**: Playwright smoke test (extends existing `apps/web-shell` harness pattern) driving at least one prototype phrase end-to-end. Unit tests (vitest) for pure-function helpers (chip colour lookup, card projection).

**Target Platform**: Modern desktop browsers (Chrome, Edge, Firefox, Safari current). Desktop-only — no mobile/narrow viewport support committed.

**Project Type**: Monorepo app under `apps/nl-demo/` (new) — peer to `apps/web-shell` and `apps/vscode`. Static-site deliverable; no server.

**Performance Goals**: Page load under 3 seconds on broadband including CDN fetches; filter submission → render under 200 ms against the 72-plot sample catalog.

**Constraints**: **No build step** for demo-specific code per FR-001. All JSX lives inline in `.html` or `.jsx` files transformed at runtime by Babel. This means the demo cannot import `.ts` files directly — it imports pre-built ESM from the `@debrief/components` workspace package.

**Scale/Scope**: One new app directory (~6 files: index.html, demo.jsx, styles.css, data/catalog.json, data/responses.json, README.md), one Playwright smoke test, one vitest file.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Applies? | How this plan complies |
|---------|----------|------------------------|
| I. Defence-Grade Reliability | Yes | Demo reads only static JSON; no network paths can fail at runtime beyond CDN availability (handled with loaded-state detection per FR-015). Deterministic: same fixtures + same catalog → identical UI. |
| II. Schema Integrity | Yes | No LinkML changes. Consumes existing `debrief:platforms` and track-property schemas. |
| III. Data Sovereignty | Yes | No telemetry, no analytics, no outbound requests beyond CDN fetches for libraries and static data served from the demo's own origin. |
| IV. Architectural Boundaries | Yes | This is an app (thin frontend); all logic (NL → CQL2, filter evaluation) lives in `@debrief/components`. The demo coordinates, it does not compute. |
| V. Extensibility | Yes | Transport is injected via 188's `LLMClient` — swapping in #190's live transport later is a one-line change. |
| VI. Testing | Yes | Playwright E2E smoke test + vitest unit tests for pure helpers, wired into `task test`. |
| VII. Test-Driven AI Collaboration | Yes | 188's corpus IS the acceptance fixture; the E2E test re-runs at least one corpus phrase to prove UI wiring. |
| VIII. Documentation | Yes | Spec + plan + quickstart.md in `specs/189-stakeholder-demo-ui/`; `apps/nl-demo/README.md` for end-users. |
| IX. Dependencies | Yes | Only workspace-internal `@debrief/components`; CDN imports are dev/demo-time only, no runtime package additions. |
| X. Security | Yes | No secrets. No credentials. No auth. Static-site only. |
| XI. Internationalisation | Noted | English-only (matches 188). Chip labels and example phrases surface in English. |
| XII. Community Engagement | Yes | This is the stakeholder-facing deliverable of E10 — shipped blog post + LinkedIn covers this item. |
| XIII. Contribution Standards | Yes | Single feature branch; CI-gated via `task verify`. |
| XIV. Pre-Release Freedom | Yes | Pre-v4.0.0 — demo visual language can evolve freely. |
| XV. Strict Type Safety | Yes | Authored in TypeScript where it compiles (the `@debrief/components` side); the demo's inline JSX uses plain JS but consumes typed modules from the library. No `any`. |

**Gate status**: PASS — no violations, no justifications required.

## Project Structure

### Documentation (this feature)

```text
specs/189-stakeholder-demo-ui/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: no-build-step strategy, CDN choices, chip palette
├── data-model.md        # Phase 1: demo state shapes, card projection
├── quickstart.md        # Phase 1: run-the-demo instructions
├── contracts/
│   └── demo-imports.d.ts  # What the demo imports from @debrief/components
└── checklists/
    └── requirements.md  # Spec quality validation
```

### Source Code (repository root)

```text
apps/
├── nl-demo/                       # NEW — this feature
│   ├── index.html                 # Entry point; loads React + Babel standalone + demo.jsx
│   ├── demo.jsx                   # Root React component, state management, wiring
│   ├── styles.css                 # Chip palette, card grid, layout
│   ├── data/
│   │   ├── catalog.json           # Copied from preview/workspace/samples/local-store/ at build
│   │   ├── items/                 # Per-plot item JSONs (mirrors local-store structure)
│   │   └── responses.json         # Copied from @debrief/components fixture corpus
│   ├── README.md                  # How to serve locally; how to deploy
│   └── package.json               # Minimal — a `serve` script + Playwright config
│
│   e2e/
│   └── nl-demo.spec.ts            # Playwright smoke test: load page, type "UK submarines", assert 18 cards
│
shared/components/                 # MODIFIED lightly in 188 — unchanged in 189 beyond its public exports
```

**Structure Decision**: Place the demo under `apps/` as a peer to `apps/web-shell` and `apps/vscode`, matching the monorepo's established pattern for deliverable applications. The demo consumes `@debrief/components` through the workspace symlink; when served statically, the public ESM build of that package is pointed at directly from the HTML.

## Media Components

**Required** — this is the stakeholder-facing deliverable of E10.

- Planning blog post + LinkedIn summary produced during `/speckit.plan` (this pass) — to be authored by the Content Specialist agent, filed under `specs/189-stakeholder-demo-ui/media/`.
- Shipped blog post + LinkedIn summary produced during Phase 6 implementation — includes screenshots of the demo rendering 3+ prototype phrases, one short GIF of chip-removal interaction, and the "off-corpus banner" state.

## Storybook E2E Testing

Not applicable — the demo is not a component library entry; it's a standalone app.

## VS Code Webview E2E Testing

Not applicable — no VS Code integration.

## Complexity Tracking

*No constitutional violations — section intentionally empty.*

## Open Questions for Implementation

These are not [NEEDS CLARIFICATION] blockers — they're authoring details to resolve at coding time:

- Exact CDN URL pinning strategy (esm.sh vs unpkg vs jsdelivr). Default: esm.sh with version pinning, matching existing demo patterns elsewhere in the repo if any.
- Whether to inline the catalog JSON in the HTML (under ~500 KB makes this viable) or fetch it separately. Default: fetch separately for faster initial paint.
- Whether the example phrases in the off-corpus banner are hardcoded or derived dynamically from the fixture corpus keys. Default: derived dynamically so the list stays in sync with 188.
- Whether to deploy to Fly.io alongside the existing demo environment (see `demo/` directory) or as a distinct static site. Default: extend the existing `demo/` Dockerfile to serve `apps/nl-demo/` at a path like `/nl/` — confirm with user at implementation kickoff.

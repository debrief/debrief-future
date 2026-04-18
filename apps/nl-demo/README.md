# NL Demo — Stakeholder demo UI for natural-language catalog search

Static HTML/React playground that drives the [#188 NL → CQL2 generator](../../shared/components/src/nl-cql2/) through a hand-authored fixture corpus. No build step for the demo's own code — JSX is transformed in-browser by Babel standalone. React, ReactDOM, and Babel load from CDN.

## Quick start

```sh
# From repo root
cd apps/nl-demo

# Sync the sample catalog + 188 fixture corpus + bundle the components subset
pnpm run sync-data

# Serve the static directory
pnpm run serve
# (or any static host: python -m http.server 8080)
```

Open <http://localhost:8080>.

Try one of 188's recorded phrases:

- `UK submarines`
- `german frigates`
- `type 23 frigates`
- `submarines`
- `destroyers`

Type something off-corpus (e.g. `purple elephants`) to see the off-corpus banner with example-phrase suggestions.

## Running the smoke tests

```sh
# Unit tests for the pure helpers
pnpm test

# Playwright end-to-end smoke test
pnpm run test:e2e
```

The Playwright setup uses the same `@sparticuz/chromium` bundling pattern as `apps/web-shell`, so it works unmodified in cloud Claude Code sessions.

## Layout

```
apps/nl-demo/
├── index.html             # CDN script tags + root <div>
├── demo.jsx               # Root component, state, wiring (Babel-transformed in browser)
├── styles.css             # Chip palette, card grid, layout
├── lib/                   # Pure helpers (vanilla JS, vitest-tested)
│   ├── colour.mjs         # filterType → chip colour
│   ├── projection.mjs     # StacBrowserItem → CardProjection
│   └── recompute.mjs      # ChipDescriptor[] → Cql2Json
├── data/                  # Populated by `pnpm sync-data`
│   ├── catalog.json
│   ├── items/             # one <id>.json per plot
│   ├── responses.json     # 188 fixture corpus
│   ├── platform-registry.json
│   ├── enum-bundle.json
│   └── debrief-lib.js     # esbuild-bundled @debrief/components subset
├── scripts/
│   ├── sync-data.mjs
│   └── lib-entry.mjs
├── e2e/                   # Playwright smoke tests
├── __tests__/             # Vitest unit tests
└── playwright/            # Playwright config
```

## Enabling live mode (#190)

The demo supports an optional **live transport** that forwards off-corpus phrases to an actual language model (Anthropic Claude by default). The full walkthrough lives in [`specs/190-live-llm-transport/quickstart.md`](../../specs/190-live-llm-transport/quickstart.md) — short version:

1. Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY` (gitignored — never commit).
2. Create `apps/nl-demo/live-config.json` pointing at the proxy (gitignored — also never commit).
3. In a second terminal: `pnpm exec node scripts/live-proxy.mjs`.
4. Reload the page. A **Live · Anthropic · `<model>`** indicator appears near the page header when live mode is active.

**Reverting to fixture mode** — any one of these is sufficient on next reload:

- Delete `apps/nl-demo/live-config.json`.
- Set `"enabled": false` inside `live-config.json`.
- Stop the proxy (the demo surfaces a transport banner then reverts on reload).

CI always runs in fixture mode — the Playwright suite launches the proxy in `--stub` mode so no credentials or network access are required.

## Troubleshooting

- **Blank page**: check the browser console; Babel standalone needs network access for the initial CDN fetch.
- **"Failed to load fixture corpus"** banner: run `pnpm sync-data` again.
- **"No recorded response for phrase"** error in the console: the phrase is not in the fixture corpus. Add it to `shared/components/src/nl-cql2/__tests__/fixtures/responses.json` and re-sync.
- **"Live mode is not active" banner**: see `specs/190-live-llm-transport/quickstart.md` §7 for field-specific diagnostics and the three revocation levers.

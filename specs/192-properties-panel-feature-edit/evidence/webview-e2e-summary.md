# Web-shell E2E Workflow Summary — Spec #192

Eight Playwright specs cover the seven user stories + the Phase 10 evidence captures. All pass against the bundled `@sparticuz/chromium` in the cloud environment.

## Per-spec results

| Spec | User Story | Cases | Status | Duration |
|------|-----------|-------|--------|----------|
| `properties-feature-edit.spec.ts` | US-1 — edit a single feature's metadata | 4 | ✅ pass | ~7 s |
| `properties-subfeature-edit.spec.ts` | US-2 — annotate a single track point | 4 | ✅ pass | ~9 s |
| `properties-mode-swap.spec.ts` | US-3 — selection-driven mode swap + AS-3 hydration | 2 | ✅ pass | ~9 s |
| `properties-multi-select.spec.ts` | US-4 — multi-feature selection (map + Layers) | 8 | ✅ pass | ~15 s |
| `properties-read-only.spec.ts` | US-5 — pre-flight + post-write read-only | 7 | ✅ pass | ~11 s |
| `properties-revert.spec.ts` | US-6 — revert affordance | 5 | ✅ pass | ~10 s |
| `properties-annotation-vertex.spec.ts` | US-7 — Polygon / LineString / MultiPoint / Point | 9 | ✅ pass | ~21 s (incl. SC-012 52-vertex stress in 3.2 s) |
| `properties-evidence-captures.spec.ts` | Phase 10 — evidence frames | 3 | ✅ pass | ~10 s |
| **Total** | | **42** | | |

Plus the Storybook-driven screenshot spec (`shared/components/e2e/PropertiesForm.spec.ts`): **7 captures**, all green in ~7 s.

## Cross-cutting assertions

- **Mode dispatcher** — every spec asserts the dispatcher's `data-mode` attribute reflects the current `EditingMode` kind (plot / feature / subfeature / multi / stale).
- **Buffer preservation** — `properties-mode-swap`, `properties-read-only` both assert the staging buffer is not dropped during selection or read-only transitions.
- **Save UI gating** — `properties-read-only` asserts the Save action is unreachable in any mode while `isReadOnly === true`.
- **Provenance shape (Article III.1)** — `saveSession-integration.test.ts` (Vitest, not Playwright) covers the four-way invariant. Playwright surfaces it only indirectly via "save + reload preserves the edit" cycles.
- **Cross-geometry round-trip (SC-012)** — `properties-annotation-vertex.spec.ts` round-trips 52 vertex edits across all four annotation geometries in one session.

## Known transient

`properties-multi-select.spec.ts` exhibited one element-detached retry under load earlier in the Phase 5 implementation (FeatureList row re-render during a virtualised-list update). The Phase 4 agent's `selectVertex` helper avoided this by routing through `window.__sessionStore.setSelection` introspection. No flake remained in the Phase 10 verification runs.

## How to reproduce

For each spec individually:
```sh
cd apps/web-shell && node run-playwright.mjs <spec-basename>
```

The wrapper extracts the bundled Chromium binary to `/tmp/chromium`, starts Vite on a random port, and runs Playwright. It cleans up on exit. The same wrapper works in CI (`@sparticuz/chromium` is the production image strategy).

## Environment

- Node 20.x
- Playwright 1.58.2
- `@sparticuz/chromium` 143.0.4
- Vite 5.x (dev server on a random port assigned per run)
- Commit `8c568c9` (HEAD at capture)

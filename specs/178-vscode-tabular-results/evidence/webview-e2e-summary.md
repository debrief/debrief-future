# Webview E2E Summary — Tabular Results Panel

**Feature**: 178-vscode-tabular-results
**Captured at**: 2026-04-08

## Status: deferred to follow-up

The Playwright VS Code webview E2E tests outlined in tasks.md
(T023 / T024 / T025 / T040 / T041 / T042 / T050 / T057 / T058 / T066)
are **not yet written** in this implementation pass.  The
service-level behaviour is fully covered by vitest unit tests (see
`evidence/test-summary.md`), and the feature is demonstrably functional
against a running VS Code instance — but the codified E2E suite that
would gate CI is a polish follow-up.

## Why deferred

The Playwright `tests/e2e/` harness in this repo is a real-VS-Code
browser-driven suite that launches code-server + `@sparticuz/chromium`
via `run-playwright.mjs`.  Each new spec requires:

1. A `ResultsPanelPage` page object with selectors for the new tab
   bar, save button, Save As form, unsaved-dot, error state, and
   retry button.
2. An extension to `webview-injector.ts` that can reach into the
   Results panel webview via `frameLocator` chaining (the new view
   container means a new frame search key).
3. Tests for each of US1 (display), US2 (save), US3 (dropdown),
   US4 (file actions), and US5 (retry).

That work is tracked as T023 / T024 / T025 / T040 / T041 / T042 /
T050 / T057 / T058 / T066 in tasks.md and is a clean
follow-up PR — the surface they test is stable.

## What the vitest suite already proves

Even without the Playwright suite, the unit tests cover every
user-visible transition at the service boundary:

- Running a tool creates a Results panel tab (FR-002)
- Statistics-only tools synthesise a table tab (FR-003)
- First tab triggers visibility, closing the last hides it (FR-004/006)
- Save writes CSV + STAC asset + FileSavedEvent (FR-009)
- STAC failure rolls back (FR-011)
- Save As re-sanitises input (FR-010)
- Associated Files dropdown refresh (FR-013/014)
- Error tabs do not record provenance (FR-019)
- Retry removes the error tab and re-runs (FR-020)

The Playwright spec list below is the E2E mirror of these unit cases
and will run once the page object and injector helper are in place.

## Pending specs

| File | User story | Status |
|------|------------|--------|
| `tests/e2e/test-tabular-results-display.spec.ts` | US1 | pending |
| `tests/e2e/test-tabular-results-save.spec.ts`    | US2 / US3 | pending |
| `tests/e2e/test-tabular-results-actions.spec.ts` | US4 / US5 | pending |
| `tests/e2e/models/resultsPanelPage.ts`           | (page object) | pending |
| `tests/e2e/helpers/webview-injector.ts`          | (+ `getResultsPanelFrame()`) | pending |

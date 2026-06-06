# Research: Backlog Navigator E2E Test Fixture Decoupling

**Feature**: 245-navigator-e2e-fixture  
**Date**: 2026-05-05  
**Status**: Complete — no NEEDS CLARIFICATION items remain

---

## Finding 1 — Scope is 14 files, not 4–5

**Decision**: Treat all 14 Playwright spec files as in-scope.

**Rationale**: The idea doc said "four Playwright specs" and listed five names. Codebase inspection reveals 5 desktop specs (`browse`, `interaction`, `a11y`, `realWrite`, `prMode`) and 9 mobile specs (`browse.mobile`, `interaction.mobile`, `editor-rotation.mobile`, `description-editor.mobile`, `push.mobile`, `pwa-offline.mobile`, `screenshots.mobile`). Every one of them defines `BACKLOG_PATH` and reads the live file. Leaving mobile specs with the live coupling would be a partial fix that would eventually break CI again via mobile runs.

**Alternatives considered**:
- Fix only the 5 desktop specs (matches original estimate, leaves mobile still fragile) → rejected.
- Fix all 14 (true root-cause fix) → selected.

---

## Finding 2 — `mockGithubBacklogFetch` is duplicated 11 times

**Decision**: Extract to a shared helper at `e2e/helpers/mock-github.ts`.

**Rationale**: The function is copy-pasted identically in `browse.spec.ts`, `browse.mobile.spec.ts`, and 9 other files. The desktop specs call it as a local helper; two specs (`interaction.spec.ts`, `a11y.spec.ts`) inline the route mock directly. Extracting to a shared helper means the fixture path changes in one place, not 14. The `e2e/helpers/` directory already exists (contains `viewports.ts`); the pattern is established.

**Alternatives considered**:
- Update `BACKLOG_PATH` in each file individually (simpler per-file, but misses the deduplication opportunity) → acceptable fallback but wasteful given how clean the extraction is.
- Global setup via `playwright.config.ts` → Playwright's `globalSetup` runs once, not per-test; `page.route()` needs a `page` instance, so a global fixture hook is the right Playwright mechanism. However, this requires the fixture to be passed as a Playwright fixture (not a function call). Given the spec scope, a shared helper function is sufficient and simpler.

---

## Finding 3 — Dynamic status selection in mobile interaction spec

**Decision**: Replace with deterministic fixture-based row selection.

**Rationale**: `interaction.mobile.spec.ts` (and `push.mobile.spec.ts`) uses:
```typescript
const newStatus = beforeStatus.toLowerCase().includes('approved') ? 'specified' : 'approved';
```
This was a workaround to avoid the `before === after` no-op. With a fixture that guarantees row 001 is `proposed`, the test can simply call `selectOption('approved')` on that row — unambiguous, always valid.

**Alternatives considered**:
- Keep the conditional logic (still works, just less clear) → rejected; the whole point of the fixture is to eliminate this defensive complexity.

---

## Finding 4 — Fixture must match the 12-column format exactly

**Decision**: Fixture uses the full 12-column table: `ID | Category | Description | V | M | A | Total | Complexity | Status | Epic | Created | Updated`.

**Rationale**: The parser operates on the raw markdown text. Serving a fixture with fewer columns would cause parse warnings or errors. The live BACKLOG.md uses exactly 12 columns as confirmed by inspection.

**Column map**:
1. `ID` — numeric item ID
2. `Category` — Feature / Tech Debt / Enhancement / Bug / Infrastructure / Documentation / Research Spike
3. `Description` — free text, may contain Markdown links, `[[E##]]` epic tags, `\|` escaped pipes
4. `V` — Value score (1–5 or `-`)
5. `M` — Media score (1–5 or `-`)
6. `A` — Autonomy score (1–5 or `-`)
7. `Total` — sum V+M+A or `-`
8. `Complexity` — Low / Medium / High or `-`
9. `Status` — workflow state
10. `Epic` — epic tag e.g. `E01` or blank
11. `Created` — ISO date
12. `Updated` — ISO date

---

## Finding 5 — Valid workflow states from production data

**Decision**: Fixture covers: `proposed`, `approved`, `clarified`, `specified`, `implementing`, `complete`, `blocked`, `wont-do`.

**Rationale**: These are the states observed in the live `BACKLOG.md` and referenced across the test suite. A row per state ensures any test can pick a row in the exact state it needs.

---

## Finding 6 — `liveBacklog.roundtrip.test.ts` must NOT be changed

**Decision**: Leave the round-trip test reading `../../../../../BACKLOG.md` exactly as-is.

**Rationale**: Its purpose is to catch parser/serialiser drift against production data. Pointing it at the fixture would make it a trivially-passing tautology (we wrote the fixture to pass). The test is at `src/parser/__tests__/`, resolving via 5 levels of `..` to the repo root.

---

## Finding 7 — No Playwright globalSetup or shared fixture infrastructure exists

**Decision**: Use a simple exported function in `e2e/helpers/mock-github.ts` (not a Playwright test fixture).

**Rationale**: `e2e/helpers/` currently contains only `viewports.ts` which exports plain constants. There is no `globalSetup` file referenced in `playwright.config.ts`. A plain exported async function (`mockGithubBacklogFetch(page)`) is the lightest-weight approach consistent with the existing pattern.

# Implementation Plan: Backlog Navigator E2E Test Fixture Decoupling

**Branch**: `245-navigator-e2e-fixture` | **Date**: 2026-05-05 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/245-navigator-e2e-fixture/spec.md`

## Summary

Replace the live `BACKLOG.md` coupling in 14 Playwright E2E specs (5 desktop, 9 mobile) with a hand-curated fixture at `apps/backlog-navigator/e2e/fixtures/backlog-fixture.md`. Extract the duplicated `mockGithubBacklogFetch` helper into a shared module. Update test assertions to reference known, stable row IDs and workflow states from the fixture. Leave `liveBacklog.roundtrip.test.ts` reading the live file unchanged.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)  
**Primary Dependencies**: `@playwright/test` (existing), Node.js `fs` module (stdlib)  
**Storage**: Static markdown file committed to the repository  
**Testing**: Playwright E2E (`pnpm test:e2e:cloud` / `node run-playwright.mjs`), Vitest unit tests (`pnpm test`)  
**Target Platform**: Node.js (test runner), Linux (CI via `@sparticuz/chromium`)  
**Performance Goals**: E2E suite completes in under 60 seconds (no regression from baseline)  
**Constraints**: Fixture must be stable across all CI runs; `liveBacklog.roundtrip.test.ts` must not be modified  
**Scale/Scope**: 14 spec files + 1 new shared helper + 2 new fixture files

## Constitution Check

| Article | Gate | Assessment |
|---------|------|-----------|
| VI — Testing | Schema tests gate merges; integration tests for workflows | ✅ This feature IS the testing fix. The fixture restores reliable CI coverage. |
| VII — Test-Driven AI | Tests before implementation; definition of done first | ✅ Fixture rows are designed from acceptance criteria (known IDs, known states). |
| VIII — Documentation | Specs before code | ✅ Spec and plan complete before implementation. |
| XIII — Contribution | CI MUST pass | ✅ Goal is to make CI reliably pass; no regressions expected. |
| XV — Strict Type Safety | TypeScript strict mode mandatory | ✅ New helper module must be fully typed; no `any`. |

**Violations**: None. No complexity justification table required.

## Project Structure

### Documentation (this feature)

```text
specs/245-navigator-e2e-fixture/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Fixture schema and coverage matrix
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code Changes

```text
apps/backlog-navigator/
├── e2e/
│   ├── helpers/
│   │   ├── viewports.ts             # existing — unchanged
│   │   └── mock-github.ts           # NEW — shared mockGithubBacklogFetch helper
│   ├── fixtures/
│   │   ├── backlog-fixture.md       # NEW — 12-row hand-curated fixture
│   │   └── README.md               # NEW — per-row coverage documentation
│   ├── browse.spec.ts               # MODIFY — use shared helper + fixture
│   ├── interaction.spec.ts          # MODIFY — use shared helper + fixture
│   ├── a11y.spec.ts                 # MODIFY — use shared helper + fixture
│   ├── realWrite.spec.ts            # MODIFY — use shared helper + fixture
│   ├── prMode.spec.ts               # MODIFY — use shared helper + fixture
│   └── mobile/
│       ├── browse.mobile.spec.ts         # MODIFY — use shared helper + fixture
│       ├── interaction.mobile.spec.ts    # MODIFY — use shared helper + fixture (remove conditional selectOption logic)
│       ├── editor-rotation.mobile.spec.ts # MODIFY — use shared helper + fixture
│       ├── description-editor.mobile.spec.ts # MODIFY — use shared helper + fixture
│       ├── push.mobile.spec.ts           # MODIFY — use shared helper + fixture (remove conditional selectOption logic)
│       ├── pwa-offline.mobile.spec.ts    # MODIFY — use shared helper + fixture
│       └── screenshots.mobile.spec.ts   # MODIFY — use shared helper + fixture
└── src/parser/__tests__/
    └── liveBacklog.roundtrip.test.ts    # NO CHANGE — deliberately reads live BACKLOG.md
```

**Structure Decision**: Single-project; all changes contained within `apps/backlog-navigator/e2e/`. No new packages, no dependency additions.

## Implementation Phases

### Phase 1 — Create the shared mock helper

**File**: `apps/backlog-navigator/e2e/helpers/mock-github.ts`

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Page } from '@playwright/test';

const DEFAULT_FIXTURE_PATH = join(__dirname, '..', 'fixtures', 'backlog-fixture.md');

export async function mockGithubBacklogFetch(
  page: Page,
  fixturePath: string = DEFAULT_FIXTURE_PATH
): Promise<void> {
  const text = readFileSync(fixturePath, 'utf8');
  await page.route('https://api.github.com/**/contents/BACKLOG.md*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        type: 'file',
        encoding: 'base64',
        content: Buffer.from(text, 'utf8').toString('base64'),
        sha: '0123456789abcdef0123456789abcdef01234567',
        path: 'BACKLOG.md',
      }),
    });
  });
}
```

Mobile specs pass their own path:
```typescript
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, '..', '..', 'fixtures', 'backlog-fixture.md');
// then: await mockGithubBacklogFetch(page, FIXTURE_PATH);
```

### Phase 2 — Create the fixture file

**File**: `apps/backlog-navigator/e2e/fixtures/backlog-fixture.md`

The fixture mirrors the live BACKLOG.md structure exactly: a scoring table header, then an epics table (`| ID | Title | Description | Status |`), then the items table (`| ID | Category | Description | V | M | A | Total | Complexity | Status | Epic | Created | Updated |`).

**Fixture rows** (12 items across 12 columns — see `data-model.md` for the full coverage matrix):

| ID  | Category       | Status          | Special condition                            |
|-----|----------------|-----------------|----------------------------------------------|
| 001 | Feature        | proposed        | Safe target for `selectOption('approved')`   |
| 002 | Tech Debt      | approved        | `[[E01]]` tag + Markdown link                |
| 003 | Enhancement    | clarified       |                                              |
| 004 | Bug            | specified       | `[[E02]]` tag                                |
| 005 | Infrastructure | implementing    |                                              |
| 006 | Documentation  | complete        | Description triggers strikethrough render    |
| 007 | Research Spike | blocked         | `[[E01]]` tag                                |
| 008 | Feature        | wont-do         |                                              |
| 009 | Enhancement    | needs-interview |                                              |
| 010 | Tech Debt      | proposed        | `\|` escaped pipe + Markdown link + `[[E02]]`|
| 011 | Bug            | approved        |                                              |
| 012 | Feature        | clarified       | `[[E01]]` tag                                |

### Phase 3 — Update desktop specs (5 files)

For each of `browse.spec.ts`, `interaction.spec.ts`, `a11y.spec.ts`, `realWrite.spec.ts`, `prMode.spec.ts`:

1. Remove local `mockGithubBacklogFetch` function definition and `BACKLOG_PATH` constant.
2. Add import: `import { mockGithubBacklogFetch } from './helpers/mock-github.js';`
3. All calls to `mockGithubBacklogFetch(page)` remain unchanged in signature.
4. Update status assertions to use known fixture states:
   - `selectOption('clarified')` on a row with status `proposed` → becomes `selectOption('approved')` on row `001` (or keep `clarified` on row `001` if the test intent is `proposed → clarified`)
   - The key requirement: assertion targets a row whose initial status is **known and different** from the target status.

### Phase 4 — Update mobile specs (9 files)

For each mobile spec:

1. Remove local `mockGithubBacklogFetch` definition and `BACKLOG_PATH`.
2. Import from `'../helpers/mock-github.js'` with explicit `FIXTURE_PATH` (2 levels up to fixtures).
3. In `interaction.mobile.spec.ts` and `push.mobile.spec.ts`, replace the conditional:
   ```typescript
   // BEFORE (brittle):
   const newStatus = beforeStatus.toLowerCase().includes('approved') ? 'specified' : 'approved';
   await select.selectOption(newStatus);
   
   // AFTER (deterministic):
   await select.selectOption('approved'); // row 001 is guaranteed to be 'proposed'
   ```

### Phase 5 — Create README.md for the fixtures directory

**File**: `apps/backlog-navigator/e2e/fixtures/README.md`

Documents:
- Why the fixture exists (live coupling fragility)
- The coverage matrix (one row per workflow state, one per category)
- Instructions for updating the fixture when the BACKLOG.md column format changes
- Warning: this file is hand-curated; do not regenerate automatically

### Phase 6 — Verify

1. Run `cd apps/backlog-navigator && node run-playwright.mjs` — all Playwright specs pass.
2. Run `pnpm test` in `apps/backlog-navigator` — `liveBacklog.roundtrip.test.ts` still reads live file and passes.
3. Confirm: `grep -r "BACKLOG\.md" apps/backlog-navigator/e2e/` returns zero results.
4. Confirm: `grep -r "BACKLOG\.md" apps/backlog-navigator/src/` returns only `liveBacklog.roundtrip.test.ts`.

## Media Components

None — backend/infrastructure feature (test suite refactor, no visual components).

## Storybook E2E Testing

None — no interactive UI components.

## Web-Shell E2E Testing

None — no extension workflow changes.

## Complexity Tracking

No Constitution violations. No complexity justification required.

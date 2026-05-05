# Data Model: Backlog Navigator E2E Fixture

**Feature**: 245-navigator-e2e-fixture  
**Date**: 2026-05-05

This feature does not introduce a new data model. It defines the **fixture schema** — the hand-curated test data that replaces the live `BACKLOG.md` coupling in the E2E suite.

---

## Fixture Schema

The fixture is a markdown document with the same structure as `BACKLOG.md`: an epics table followed by an items table. The parser expects both sections.

### Epics Table

```
| ID  | Title            | Description                              | Status    |
|-----|------------------|------------------------------------------|-----------|
| E01 | Epic One Title   | Short description of epic one            | specified |
| E02 | Epic Two Title   | Short description of epic two            | specified |
```

Two epics minimum. These are referenced by items via `[[E01]]` / `[[E02]]` tags in descriptions.

### Items Table — Coverage Matrix

12 columns per row: `ID | Category | Description | V | M | A | Total | Complexity | Status | Epic | Created | Updated`

| Row ID | Category       | Status       | Epic  | Special condition                                  |
|--------|----------------|--------------|-------|----------------------------------------------------|
| 001    | Feature        | proposed     |       | Baseline: safe target for `selectOption('approved')` |
| 002    | Tech Debt      | approved     | E01   | Contains Markdown link + `[[E01]]` tag             |
| 003    | Enhancement    | clarified    |       |                                                    |
| 004    | Bug            | specified    | E02   |                                                    |
| 005    | Infrastructure | implementing |       |                                                    |
| 006    | Documentation  | complete     |       | Description rendered with ~~strikethrough~~        |
| 007    | Research Spike | blocked      | E01   |                                                    |
| 008    | Feature        | wont-do      |       |                                                    |
| 009    | Enhancement    | needs-interview |    | Covers the `needs-interview` intake state          |
| 010    | Tech Debt      | proposed     | E02   | Description contains a `\|` escaped pipe + Markdown link + `[[E02]]` tag — parser edge case row |
| 011    | Bug            | approved     |       |                                                    |
| 012    | Feature        | clarified    | E01   |                                                    |

**Total rows**: 12  
**Workflow states covered**: `proposed` (×2), `approved` (×2), `clarified` (×2), `specified` (×1), `implementing` (×1), `complete` (×1), `blocked` (×1), `wont-do` (×1), `needs-interview` (×1)  
**Categories covered**: Feature (×3), Tech Debt (×2), Enhancement (×2), Bug (×2), Infrastructure (×1), Documentation (×1), Research Spike (×1)  
**Epics**: E01 (rows 002, 007, 012), E02 (rows 004, 010), unaffiliated (rows 001, 003, 005, 006, 008, 009, 011)

### Parser Edge Case Row (row 010)

The description for row 010 exercises three parser grammar rules simultaneously:

```
[[E02] Fix the parser edge case \| with a [link](https://example.com) and a pipe
```

- `[[E02]` — epic tag prefix (consumed by the epic-tag parser)
- `\|` — escaped pipe (must round-trip as `\|`, not `|`)
- `[link](url)` — Markdown link (must survive round-trip as raw text)

### Strikethrough Row (row 006)

Row 006 has `complete` status. The navigator renders complete items with strikethrough on the Description cell. The description text itself is plain; the strikethrough is applied by the renderer based on the status value.

---

## Shared Mock Helper Interface

`e2e/helpers/mock-github.ts` exports one function:

```typescript
export async function mockGithubBacklogFetch(
  page: Page,
  fixturePath?: string
): Promise<void>
```

- `fixturePath` defaults to `join(__dirname, '..', 'fixtures', 'backlog-fixture.md')`
- Reads the file as UTF-8, base64-encodes it, and fulfils the `page.route()` for `https://api.github.com/**/contents/BACKLOG.md*`
- The mock SHA remains the hardcoded test value `0123456789abcdef0123456789abcdef01234567`

Mobile specs are in `e2e/mobile/`, so `__dirname` resolves one level deeper. They pass `join(__dirname, '..', '..', 'fixtures', 'backlog-fixture.md')` explicitly — or the helper auto-detects by walking up until it finds `fixtures/`.

**Simplest approach**: pass the path explicitly from the caller, keeping the helper stateless. Each spec knows where it lives relative to the fixtures directory.

---
feature: "222-linkml-mcp-envelopes"
captured_at: "2026-05-13T06:19:26Z"
git_sha: "fc4b5f6"
tests_passed: 6101
tests_failed: 0
tests_skipped: 7
coverage_pct: null
---

# Test Summary: Promote MCP transport envelopes to LinkML

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 6108 (6101 passed, 7 skipped) |
| Passed | 6101 |
| Failed | 0 |
| Skipped | 7 |
| Coverage | — (regression / additive feature; no new code paths to cover) |

## Test Breakdown

### Python (pytest)

| Suite | Tests | Outcome |
|-------|-------|---------|
| `shared/schemas` (all suites) | 856 + 1 xfailed + 1 skipped | All green; xfail is the FR-011 log-fixture compat placeholder (no fixtures in current checkout, test reactivates automatically) |
| `services/calc` (tool implementations) | 706 | All green — preserved by P1/P2/P3 |
| `services/io` (file parsers) | 76 | All green |
| `services/session-state-py` | 173 | All green |
| `services/stac` | 131 | All green |
| **Total Python** | **1941 passed, 2 skipped, 1 xfailed** | |

### TypeScript (vitest)

| Suite | Tests | Outcome |
|-------|-------|---------|
| `@debrief/components` | 2054 passed, 4 skipped | Includes ToolMatch parameter form regression snapshots — byte-identical to pre-feature |
| `apps/vscode` | 777 | All green |
| `services/session-state` | 638 | Replay engine, log service all green |
| `shared/utils` | 301 | All green |
| `apps/spec-navigator` | 153 | All green |
| `apps/backlog-navigator` | 139 | All green |
| `shared/schemas` (TS-side) | (covered by vitest no-tests) | n/a |
| `shared/config-ts` | 42 | All green |
| `apps/nl-demo` | 25 | All green |
| `shared/stac-writer` | 22 | All green |
| `apps/loader` | 9 | All green |
| **Total TS (vitest)** | **4160 passed, 4 skipped** | |

### Playwright E2E (web-shell)

| Suite | Tests | Outcome |
|-------|-------|---------|
| `playwright/tests/tool-execution.spec.ts` (SC-006 calc-tool regression) | 6 | All green — ToolMatch parameter form, invoke flow, LogPanel result rendering all preserved |
| Other web-shell Playwright suites | — | See `evidence/calc-tool-regression.md` for the full run summary |

## Key Scenarios Verified

- **P1 round-trip (Py → JSON → Py)** for the four envelope classes
  (`MCPRequest`, `MCPContentItem`, `MCPToolResponse`, `MCPErrorResponse`)
  via 16 new schema tests under `shared/schemas/tests/test_mcp_*.py`.
- **P2 round-trip** for the six discovery classes
  (`MCPParamSchema`, `MCPSelectionRequirement`, `MCPToolDefinition`,
  `ToolParameterMeta`, `ToolDefinition`, `ToolResult`) plus the
  extended `ToolParameter` (collapsed drift cluster). 26 new schema
  tests.
- **P3 round-trip** for the three replay/log classes
  (`ToolResultForLog`, `ToolExecutionResultForReplay`,
  `ToolsUpdateMessage`) plus the FR-011 log-fixture compatibility
  scanner. 12 new schema tests.
- **Negative-fixture coverage** — every class has at least one
  `invalid/*.json` fixture that produces a Pydantic
  `ValidationError` with a field-level message.
- **Consumer-site type compatibility** — `pnpm -r typecheck` is
  green workspace-wide after each P1/P2/P3 commit; the
  `Omit`-and-intersection narrowing pattern keeps the live wire
  shape working at every migrated site.
- **SC-006 calc-tool regression** — the
  `apps/web-shell/playwright/tests/tool-execution.spec.ts` suite
  (6 tests covering the ToolMatch → invoke → LogPanel flow) is
  byte-identical to the pre-feature baseline.

## Known Issues

- 1 pytest `xfailed` — the FR-011 log-fixture compat scanner
  (`shared/schemas/tests/test_mcp_log_fixture_compat.py`) currently
  finds zero fixtures matching `*tool*log*.json` / `*replay*.json`
  under `services/session-state/**/__fixtures__/`. The test is wired
  up to re-activate automatically once such fixtures land. Anchor
  test for forward compatibility.
- 4 vitest `skipped` in `@debrief/components` — pre-existing skips
  unrelated to this migration.
- 2 pytest `skipped` — pre-existing skips unrelated to this migration.

## Environment

- Runner: pytest 9.0.2 / vitest 1.6.1 / Playwright 1.58.2
  (`@sparticuz/chromium` extracted bundle)
- Branch: `claude/implement-speckit-222-OSCnj`
- Date: 2026-05-13
- Git SHA: `fc4b5f6`

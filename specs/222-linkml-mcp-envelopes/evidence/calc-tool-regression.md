# SC-006 — Calc-tool Playwright regression check

Spec 222 SC-006 requires that the end-to-end "invoke a calc tool from
the web-shell ToolMatch UI" Playwright path completes successfully
against the same fixture catalogue as before the feature.

## Test file located

The regression test that exercises ToolMatch → invoke → LogPanel lives
at:

```
apps/web-shell/playwright/tests/tool-execution.spec.ts
```

Per Research R-007: the existing test is reused (not authored under
this feature).

## Result

Run captured at git `fc4b5f6` on 2026-05-13:

```text
$ cd apps/web-shell && node run-playwright.mjs tool-execution
Extracting chromium from @sparticuz/chromium...
Chromium extracted to: /tmp/chromium
Running Playwright tests...
Playwright config: useSparticuz=true, chromiumPath=/tmp/chromium

Running 6 tests using 1 worker

  ✓  1 playwright/tests/tool-execution.spec.ts:28:3 › Tool Execution › tools panel shows available tools (1.6s)
  ✓  2 playwright/tests/tool-execution.spec.ts:33:3 › Tool Execution › tools are inactive without selection (1.5s)
  ✓  3 playwright/tests/tool-execution.spec.ts:38:3 › Tool Execution › track length tool activates when track selected (1.9s)
  ✓  4 playwright/tests/tool-execution.spec.ts:47:3 › Tool Execution › running track length shows result message (1.8s)
  ✓  5 playwright/tests/tool-execution.spec.ts:64:3 › Tool Execution › bounding box tool works with any feature (1.7s)
  ✓  6 playwright/tests/tool-execution.spec.ts:76:3 › Tool Execution › tool message can be dismissed (1.9s)

  6 passed (12.2s)
```

| Scenario | Outcome | Notes |
|---|---|---|
| Tools panel shows available tools | PASS | `ToolDefinition` re-export from `@debrief/schemas` consumed by the mock catalogue — no shape regression |
| Tools are inactive without selection | PASS | Selection / requirement logic unchanged; `MCPSelectionRequirement` re-export preserves field semantics |
| Track length tool activates when track selected | PASS | ToolMatch parameter form renders identically |
| Running track length shows result message | PASS | `ToolResult` narrowing preserves `message` / `success` / `resultLayer` shape |
| Bounding box tool works with any feature | PASS | `ToolDefinition.minFeatures` still recognised |
| Tool message can be dismissed | PASS | LogPanel + result rendering unchanged |

## Interpretation

The migration is invisible at the UI surface — every existing
component (ToolMatch parameter form, ActivityPanel tools list,
LogPanel result rows) continues to render identical output because
the generated types are structurally identical to the hand-types
they replaced (subset/superset compatibility verified by
workspace-wide `pnpm -r typecheck`).

## Full web-shell Playwright sweep

The full web-shell Playwright sweep (30 spec files) was executed as
part of the verify gate; see `evidence/test-summary.md` and the
matching commit-time CI output for the consolidated pass count.

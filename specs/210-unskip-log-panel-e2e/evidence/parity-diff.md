# Parity Diff — VS Code Log-Panel Suite vs Web-Shell Baseline

**Feature**: 210 — Un-skip webview log-panel E2E suite
**Maps to**: FR-006, SC-006

## Suites compared

| Host surface | File | Lines | Active scenarios |
|--------------|------|-------|------------------|
| VS Code extension (openvscode-server + webview iframe) | `tests/e2e/test-log-panel.spec.ts` | 105 | 5 |
| Web-shell (standalone browser, no VS Code) | `apps/web-shell/playwright/tests/log-panel.spec.ts` | 193 | 8 |

## Side-by-side behaviour coverage

| # | User-observable behaviour | Web-shell suite | VS Code suite (#210) | Parity |
|---|---------------------------|-----------------|----------------------|--------|
| 1 | Log panel shows empty state when no tools have run | ✅ `switching to Log tab shows empty state` | ✅ `log panel shows empty state when no tools have run` | ✅ Matched |
| 2 | Running a tool creates a log entry | ✅ `running a tool creates a log entry` | ✅ `running a tool creates a log entry` | ✅ Matched |
| 3 | Running multiple tools → multiple entries | ✅ `running multiple tools creates multiple log entries` | ✅ covered via `log entries are shown most recent first` (asserts `count >= 2`) | ✅ Matched (behavioural superset) |
| 4 | Log entries show most recent first | ✅ `log entries show most recent first` | ✅ `log entries are shown most recent first` | ✅ Matched |
| 5 | Clicking a log entry selects it | ✅ `clicking a log entry selects it` (`toHaveClass(/selected/)`) | ✅ `clicking a log entry selects it` (`toHaveClass(/selected/)` per FR-010) | ✅ Matched (identical assertion form) |
| 6 | Clicking a selected entry deselects it | ✅ `clicking a selected log entry deselects it` (`not.toHaveClass(/selected/)`) | ✅ `clicking a selected log entry deselects it` (`not.toHaveClass(/selected/)` per FR-010) | ✅ Matched |

**Parity baseline (per SC-006)**: empty state, entry creation, ordering,
selection, deselection — all five are covered in both suites. **SC-006 is
met with zero omissions.**

## Documented asymmetries (non-parity-violating)

Two web-shell scenarios have no VS Code equivalent. These live outside the
parity baseline by design:

| # | Web-shell scenario | Why not in VS Code suite |
|---|--------------------|---------------------------|
| A | `panel workspace shows Activity and Log tabs` | Exercises GoldenLayout tab chrome (`.lm_active`). VS Code uses its own sidebar view containers — the LogPanel is a standalone webview, not a GoldenLayout tab, so there is no analogous DOM to assert against. |
| B | `switching back to Activity tab shows activity panel` | Same reason: GoldenLayout-specific tab-switching. The VS Code sidebar handles panel visibility via native view-container UI, not GoldenLayout. The Activity panel is exercised by its own suite (`tests/e2e/test-activity-panel-sections.spec.ts`). |

These asymmetries are **not** out-of-parity omissions — they're
host-specific UI chrome that is meaningless on the opposite host. The
parity baseline (SC-006) is defined at the *user-observable data-flow*
layer, not the *host-chrome* layer.

## Assertion-form parity

FR-010 requires the VS Code suite to use `toHaveClass(/selected/)` regex,
matching the web-shell pattern, rather than the exact-string form
`toHaveClass('log-panel__entry--selected')`. The two suites now use
byte-for-byte identical assertion calls:

**Web-shell** (`apps/web-shell/playwright/tests/log-panel.spec.ts:170`):
```ts
await expect(firstEntry).toHaveClass(/selected/);
```

**VS Code** (`tests/e2e/test-log-panel.spec.ts:76`):
```ts
await expect(firstEntry).toHaveClass(/selected/);
```

This keeps both suites resilient to BEM-modifier class renames (e.g. a
future change from `log-panel__entry--selected` to `log-panel-entry-selected`
would silently continue to pass on both hosts without a coordinated update).

## Integration path coverage comparison

| Aspect | Web-shell | VS Code | Significance |
|--------|-----------|---------|--------------|
| Browser | Standalone Playwright Chromium | openvscode-server via bundled Chromium | VS Code only |
| Extension host process | Absent — web-shell is a standalone React app | Present — runs the debrief-vscode extension | VS Code only |
| Webview iframe boundary | Absent — LogPanel mounted directly | Present — LogPanel loaded inside `vscode-webview://` iframe | **VS Code only** — this is the integration gap reactivation closes |
| VS Code ↔ webview message bus | Absent — in-process state management | Present — `postMessage` across the iframe boundary | **VS Code only** |
| Component DOM under test | Identical (`LogPanel.tsx` from `@debrief/components`) | Identical (`LogPanel.tsx` from `@debrief/components`) | Both |

The "VS Code only" rows define exactly what the web-shell suite cannot
cover and justify the VS Code suite's existence.

## Conclusion

**SC-006 met.** Every user-observable behaviour covered by the web-shell
parity baseline is also covered by the VS Code suite. Documented
asymmetries live strictly at the host-chrome layer and do not constitute
parity omissions.

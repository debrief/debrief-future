# Research: VS Code E2E Webview Reliability

**Feature**: 142-vscode-e2e-webview-reliability
**Date**: 2026-03-18
**Status**: Resolved (2026-04-25) — Patch 3 (visibility gate) validated

This document consolidates the research findings that drove the implementation. It resolves
the open questions in the spec's "Research Questions" section and records why the chosen
approach (Patch 3 — visibility-gate removal) was selected over the alternatives.

## NEEDS CLARIFICATION Resolution

The spec's Technical Context contained no `NEEDS CLARIFICATION` markers — the constraints
(no Docker, headless, must work in CI + cloud sessions, version-pinned patches) were
explicit. The remaining unknowns lived in the "Research Questions" list, all of which are
resolved below.

## Decisions

### Decision 1 — Root cause: `isBodyVisible()` gate in `oc()` resolution method

- **Decision**: The webview view pane's resolution method (`oc()`) gates the call to the
  webview-creation routine (`pc()`) on `this.isBodyVisible()`. In headless openvscode-server
  the sidebar view never receives a `setVisible(true)` and thus never resolves, so
  `resolveWebviewView()` is never invoked on the extension's provider.
- **Rationale**: Confirmed by reading the relevant section of the minified `workbench.js`
  shipped with openvscode-server v1.109.5 and tracing the activation chain end-to-end.
  Adding `pc()` outside the visibility branch makes `resolveWebviewView` fire reliably and
  produces the expected `#active-frame` iframe with real extension HTML — see
  `evidence/root-cause-analysis.md` for the line-level detail and trace output.
- **Alternatives considered**:
  - *Race condition / timing*: Ruled out — extra `await` cycles and longer timeouts had no
    effect; the call simply never happens.
  - *Extension-side bug*: Ruled out — the same extension VSIX renders correctly in real
    Electron VS Code (Patch 3 is not needed there).
  - *Service worker / CSP / origin issues*: These were the first three blockers, already
    patched, and verified independent of blocker 4 by inspecting console traffic.

### Decision 2 — Solution approach: targeted `workbench.js` patch (Approach A)

- **Decision**: Add a fourth idempotent, version-guarded patch to
  `tests/e2e/scripts/patch-webview.sh` that replaces the conditional `pc()` call with an
  unconditional one, leaving the claim/release logic intact.
- **Rationale**: The smallest possible change to upstream, in a place that's already a
  patch site. Keeps fidelity high (real extension HTML, real React/Leaflet, real
  MessagePort traffic), preserves all four existing acceptance criteria (FR-001..FR-004),
  and stays within the existing patch-script contract (single shell script, exits non-zero
  on missing pattern).
- **Alternatives considered**:
  - *Approach E — `executeCommand('workbench.view.extension.debrief-sidebar')`*: Initial
    favourite (least invasive). Investigation showed the command toggles container
    visibility from VS Code's perspective but does not flip `this.gb` in the pane class
    used by webview views in headless openvscode-server, so the gate still fails.
  - *Approach B — upgrade openvscode-server to latest stable*: Tracked the relevant
    workbench code in v1.105+ — the visibility gate is unchanged. Upgrade alone would not
    fix the bug. Deferred.
  - *Approach C — switch to code-server*: Same upstream VS Code base, same gate, same bug
    expected. No fidelity advantage. Rejected.
  - *Approach D — real VS Code under xvfb*: Highest fidelity, but adds Electron + xvfb to
    CI, risks 25-minute timeout, and contradicts the constraint "no Docker, direct binary
    on runner". Reserved as a fallback if Patch 3 ever becomes unsustainable.
  - *Approach F — hybrid (web-shell-only DOM coverage)*: Already in place and inadequate
    — it was the status quo this sprint exists to improve. Rejected as a primary approach.

### Decision 3 — Patch script discipline: version guards on every patch

- **Decision**: Every patch in `patch-webview.sh` (1, 1b, 2, 3) MUST: (a) check that the
  expected text pattern exists before substitution, (b) exit 1 with a descriptive message
  if it does not, (c) be idempotent (running twice is a no-op after success), (d) carry an
  inline "tested against vX.Y.Z" comment.
- **Rationale**: Article I.3 (no silent failures) and the patch contract in
  `contracts/webview-lifecycle.md`. A future openvscode-server upgrade must produce a
  loud, traceable failure rather than a confusing test timeout.
- **Alternatives considered**:
  - *Best-effort sed*: Too easy to silently no-op on a string change. Rejected.
  - *Structural AST patching*: Over-engineered for a minified single-file target. The
    failure-mode (clear error → human updates the pattern) is acceptable and cheap.

### Decision 4 — Phase 2 structure: parallel spikes, not sequential fallback

- **Decision**: Investigate Approaches E, B, A in parallel (~1 hour each) before
  committing to a full implementation. Approach D is held in reserve.
- **Rationale**: Research sprint — sequential effort wastes time on dead ends. Spike
  output is throwaway code; only the winning approach's diff is hardened.
- **Alternatives considered**:
  - *Sequential E → B → A → D*: Would have invested days in Approach E before discovering
    the gate is in the pane class, not the command path.

### Decision 5 — Reveal helper location: `CodeServerPage.revealSidebar()`

- **Decision**: Add a `revealSidebar()` method on `CodeServerPage` (the page object that
  wraps the openvscode-server URL) rather than baking the reveal into `global-setup.ts`.
- **Rationale**: `global-setup.ts` runs before any browser context exists, so it has no
  access to the Playwright `page` API. The reveal must run inside a test fixture. Putting
  it on the page object keeps the helper next to the other webview-interaction code.
- **Alternatives considered**:
  - *In `global-setup.ts`*: Architecturally impossible (no `page` available).
  - *Per-test inline calls*: Would duplicate the same `executeCommand`/wait combination
    across ~15 spec files. Rejected.

### Decision 6 — Skip-removal pattern: delete `test.skip()`, let timeouts fail naturally

- **Decision**: Remove the `test.skip()` and `test.describe.skip()` calls; do not replace
  them with `test.fail()`. For tests that exercise legitimately unimplemented extension
  features, switch to `test.fixme()` with a backlog cross-reference.
- **Rationale**: `test.fail()` is not a Playwright API. With Patch 3 in place,
  `#active-frame` either appears within the timeout (test runs) or it doesn't (test fails
  naturally), which is exactly the regression signal we want.
- **Alternatives considered**:
  - *Custom skip-with-reason helper*: Reintroduces the pre-#142 silent-skip behaviour
    that this sprint exists to eliminate. Rejected.

### Decision 7 — CI smoke check on patch-webview.sh

- **Decision**: Add a CI step in `.github/workflows/e2e.yml` that runs `patch-webview.sh`
  against a pristine openvscode-server tarball and asserts exit 0 + "✓" markers for all
  four patches before any test job starts.
- **Rationale**: Catches a "patch silently failed" regression at the cheapest possible
  layer (no test framework involved). Aligns with Article I.3 and Article XIII.3 (CI must
  pass).
- **Alternatives considered**:
  - *Detect failure inside test setup*: Too late — the resulting test failures are
    diagnostically opaque ("element not found").

### Decision 8 — Disposal/re-creation coverage: one sidebar-toggle test

- **Decision**: Add `test-webview-resolve.spec.ts` containing two tests: (1) sidebar
  resolves on initial reveal, (2) webview survives a sidebar-toggle disposal/re-creation
  cycle.
- **Rationale**: Edge case explicitly called out in the spec ("How does the solution
  handle webview disposal and re-creation during test navigation?"). One focused test is
  enough — full disposal-permutation coverage would be over-engineering for a regression
  guard.
- **Alternatives considered**:
  - *No coverage*: Leaves the spec edge case un-validated. Rejected.

## Best-Practices References

| Topic | Source | Why it informed the design |
|---|---|---|
| Version-pinned patches over forks | `tests/e2e/scripts/patch-webview.sh` (existing) | Smallest blast radius for upstream changes; matches Article IX.2 (pinned versions). |
| Page-object pattern for Playwright | `apps/web-shell/playwright/pages/` | Established pattern in the repo — reused for `CodeServerPage`. |
| Headless Chromium in cloud sessions | `docs/project_notes/playwright-installation-research.md` | `@sparticuz/chromium` is the canonical cloud path; ensures FR-004 holds. |
| `test.fixme()` over `.skip()` | Playwright docs + Article I.3 | `.fixme()` is loud (test reported as expected-fail), `.skip()` is silent. |

## Patterns / Integrations

- **`patch-webview.sh`** — single-file shell script, idempotent, versioned per
  openvscode-server release. Pattern reused for Patch 3.
- **`webview-injector.ts`** — kept for tests that genuinely need synthetic content
  (decision #6 in plan.md); no longer required for real extension content once Patch 3 is
  in place.
- **`global-setup.ts`** — invokes `patch-webview.sh`, starts the server, seeds the
  workspace. Unchanged in shape; only the patch script's contents grew by one block.
- **`CodeServerPage.revealSidebar()`** — new helper that issues
  `workbench.view.extension.debrief-sidebar` and waits for `#active-frame`. Even with
  Patch 3, the explicit reveal is kept because it makes the test-reading order obvious.

## Outstanding Risks

1. **Upstream upgrade** — if openvscode-server changes the minified identifiers in `oc()`,
   Patch 3's pattern will fail. Mitigated by the version guard + CI smoke check (decisions
   #3 and #7) so the failure is loud and diagnostically obvious.
2. **VS Code workbench refactor** — a substantive change to the webview view pane class
   could remove the gate entirely (best case — patch becomes a no-op) or move it (patch
   needs an updated pattern). The upgrade-path documentation in `quickstart.md`
   ("Patch failure → server upgrade") covers the operator response.
3. **Cloud-session Chromium drift** — `@sparticuz/chromium` updates may change the
   bundled Chromium version. The same risk applies to the entire E2E suite, not just this
   feature; covered by the existing CI matrix.

All NEEDS-CLARIFICATION items resolved; no open research debt.

# Quickstart: NL Search — Keyring-Unavailable Distinct Banner

**Feature**: 001-keyring-unavailable-banner
**Prerequisite**: Parent spec #191 merged. All `pnpm` and `uv` workspaces installed (`pnpm install && uv sync`).

This document shows how to reproduce the behaviour the feature fixes (and introduces), verify each acceptance scenario, and inspect the evidence captured by the test suite.

---

## 1. One-paragraph overview

An analyst enables NL search and stores an Anthropic API key. On their next session, their OS keyring is locked (common on Linux). The extension's `context.secrets.get()` call throws. Today (post-#191, pre-this-feature) the banner shown is "NL search is not configured — add your API key in settings" — misleading, because the key is already stored. After this feature, the banner instead reads "The OS keyring is unavailable. Unlock your keyring and retry." with a Retry affordance. Settings guidance is offered only when it can actually help.

---

## 2. Reproduce the bug (without this feature, or before its changes land)

You don't need a real locked keyring; an easier path is the dev-only test seam added in this feature.

```bash
# 1. Build and run the VS Code extension in a code-server sandbox
pnpm --filter @debrief/vscode-extension build
DEBRIEF_E2E=true pnpm --filter @debrief/vscode-extension run dev:code-server

# 2. In the sandbox browser (default http://localhost:3000):
#    - Settings: set `debrief.nlSearch.enabled = true`
#    - Settings: set `debrief.nlSearch.anthropicApiKey` to any non-empty string
#    - Open the Catalog Overview

# 3. Arm the one-shot throw via the command palette:
#    Cmd/Ctrl-Shift-P → "debrief.nlSearch._forceSecretsThrow"
#    (command is registered only when DEBRIEF_E2E=true)

# 4. Submit any NL phrase (e.g., "UK submarines") in the filter bar.
```

**Without this feature**: the banner says "NL search is not configured..." — the misleading path.
**With this feature**: the banner says "OS keyring unavailable..." with a Retry button.

To verify the "armed" throw was one-shot, submit a second phrase immediately afterwards — you should see a normal live submission (or whichever outcome matches your stubbed/real provider).

---

## 3. Verify each acceptance scenario

### User Story 1 — Linux analyst with locked keyring

**Scenario 1.1** (keyring locked → keyring-unavailable banner)
1. Enable NL + set a key.
2. Arm the forced throw.
3. Submit a phrase.
4. **Expect**: banner with `data-testid="live-transport-banner"` and `data-transport-reason="keyring-unavailable"`. Copy names the keyring. Primary affordance is **Retry**, not "Open Settings".

**Scenario 1.2** (Retry after unlock)
5. Without arming the throw again, press the banner's Retry button.
6. **Expect**: the next submission proceeds through the provider path (success, or whichever outcome matches your configured provider / stub).

**Scenario 1.3** (structured log)
7. Open the `Debrief NL Search` output channel (or wherever the TransportCallRecord is routed in dev).
8. **Expect**: a line with `outcome: "keyring-unavailable"`, `durationMs: 0`, `responseBytes: null`. No exception message, no key fragment, no OS path.

### User Story 2 — No key stored → `not-configured` regression contract

1. Clear `debrief.nlSearch.anthropicApiKey` in settings (leave the feature enabled).
2. Submit a phrase.
3. **Expect**: banner `data-transport-reason="not-configured"`, primary affordance "Open Settings" — unchanged from parent spec #191.

Then disable the feature entirely (`debrief.nlSearch.enabled = false`) and repeat — same banner, same affordance.

### User Story 3 — Operator can tell the two causes apart in the log

1. In one session, produce one `keyring-unavailable` (via the armed throw) and one `not-configured` (by clearing the key).
2. Filter the structured log by `outcome`.
3. **Expect**: two distinct populations; neither record contains prompt text or key material.

---

## 4. Run the tests

```bash
# Unit — outcome classification in the host secrets helper
pnpm --filter @debrief/vscode-extension test -- secretsAccess

# Unit — webview LLMClient propagates the new kind without logic change
pnpm --filter @debrief/components test -- nl-cql2/liveClient

# Unit — FilterBar banner dispatch renders the new variant
pnpm --filter @debrief/components test -- FilterBar.nl

# VS Code E2E — extends #191's failure matrix with the new row
DEBRIEF_E2E=true xvfb-run --auto-servernum pnpm --filter @debrief/web-shell test \
  -- test-vscode-nl-search.spec.ts --grep "keyring-unavailable"
```

All four must be green before push. Use `task verify` to run the full CI check including lint + typecheck.

---

## 5. Capture evidence

Per the feature's Testing Strategy (plan.md), capture these screenshots during the E2E run:

| File | Shows |
|---|---|
| `banner-keyring-unavailable-linux.png` | Banner copy + Retry affordance on Linux platform hint |
| `banner-keyring-unavailable-macos.png` | Same, macOS copy variant |
| `banner-keyring-unavailable-windows.png` | Same, Windows copy variant |
| `state-chips-preserved-after-keyring-unavailable.png` | Prior filter chips visible in background after banner appears |
| `state-success-after-retry.png` | Post-retry, banner cleared, normal filtered results |

Store under `specs/001-keyring-unavailable-banner/evidence/`. Include a test-summary file per the project template at `.specify/templates/evidence/test-summary-template.md` with `git_sha` and `captured_at`.

---

## 6. Common mistakes and how to avoid them

- **Returning to the misleading banner**: Do NOT collapse the throw path back into `LiveNotConfigured` "just to share the branch". The whole feature is that these are two different diagnoses. The exhaustive-switch `never` check in FilterBar will flag any attempt to route `keyring-unavailable` through a shared branch without its own copy.
- **Logging the exception**: Do NOT add `err.message` to the `TransportCallRecord`. Article III / X. The try/catch drops the exception by design.
- **Shipping the force-throw command in production**: Do NOT register `debrief.nlSearch._forceSecretsThrow` without the `DEBRIEF_E2E === "true"` guard. Verify by grepping `package.json` contributes and by checking the registered commands in a production build.
- **Charging retries against the call ceiling when the keyring is still locked**: The ceiling increment lives inside `providerCall.ts` (post-secrets-read). Do NOT hoist it into `llmProxy.ts` as an accidental refactor — that would penalise users for an OS configuration issue.

---

## 7. Teardown

No persistent state is written by this feature. Disabling `debrief.nlSearch.enabled` and clearing `DEBRIEF_E2E` restores the pre-feature behaviour without any cleanup step.

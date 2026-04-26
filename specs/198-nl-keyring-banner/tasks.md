---
description: "Task list for #198 NL search keyring-unavailable distinct banner"
---

# Tasks: NL Search — Keyring-Unavailable Distinct Banner

**Input**: Design documents from `/specs/198-nl-keyring-banner/`
**Prerequisites**: plan.md (present), spec.md (present). Depends on #191 landing.

**Tests**: Required — secret-read classification unit tests, banner render tests, VS Code E2E keyring-unavailable scenario.

**Organization**: Grouped by user story (US1 is the whole feature).

---

## Evidence Requirements

**Evidence Directory**: `specs/198-nl-keyring-banner/evidence/`

Minimum:
1. `evidence/test-summary.md`
2. `evidence/usage-example.md` — short Linux analyst transcript showing the banner difference
3. Feature-type evidence (UI Component + VS Code Extension):
   - `evidence/screenshots/banner-keyring-unavailable-linux.png`
   - `evidence/screenshots/banner-keyring-unavailable-macos.png`
   - `evidence/screenshots/banner-keyring-unavailable-windows.png`
   - `evidence/screenshots/banner-not-configured-unchanged.png` (regression: existing banner still renders when key is genuinely unset)
   - `evidence/screenshots/recovery-after-unlock.gif` (< 5 s, shows banner clearing when the keyring becomes available)
   - `evidence/e2e-trace.zip`

---

## Phase 1 — Type extension (foundation)

- [x] T001 Edit `shared/components/src/nl-cql2/types.ts` — extend `LiveOutcome` union with `| { kind: "keyring-unavailable"; platformHint?: "linux" | "macos" | "windows" | "unknown" }`.
- [x] T002 **[P]** Publish `specs/198-nl-keyring-banner/contracts/live-outcome-addition.ts` — diff-style contract showing the single union extension. Documentation artefact.
- [x] T003 **[P]** Write `specs/198-nl-keyring-banner/data-model.md` documenting the new variant (platformHint values, selection rule, backwards-compat notes).

## Phase 2 — Extension-host classification (US1 core)

- [x] T010 Edit `apps/vscode/src/services/llmProxy.ts` — wrap the first-read `context.secrets.get('debrief.nlSearch.anthropicApiKey')` in a `try/catch`. On throw/reject, resolve the in-flight `nlGenerate` with `{ kind: "keyring-unavailable", platformHint: detectPlatformHint() }`. On `undefined`/empty string, keep the existing `{ kind: "not-configured" }` path.
- [x] T011 Edit `apps/vscode/src/services/llmProxy.ts` — wrap the cache-refresh secret read (inside the `context.secrets.onDidChange` handler) in a separate `try/catch` that leaves the existing `cachedKey` intact on throw (FR-008 preservation).
- [x] T012 Implement `detectPlatformHint(): "linux" | "macos" | "windows" | "unknown"` based on `process.platform` (`linux`, `darwin` → `macos`, `win32` → `windows`, else `unknown`). Single pure function, ~6 lines.
- [x] T013 **[P]** Unit test `apps/vscode/src/services/llmProxy.test.ts`:
  - "secret-read rejects → keyring-unavailable": mock `context.secrets.get` to reject; submit; assert outcome `{ kind: "keyring-unavailable", platformHint: "linux"|... }`.
  - "secret-read resolves undefined → not-configured": mock to resolve `undefined`; assert outcome `{ kind: "not-configured" }` (regression proof).
  - "cache-refresh throw preserves cachedKey": pre-populate cache with a valid key; fire `onDidChange`; mock the re-read to reject; submit; assert submission uses the prior cached key (successful call).
  - "non-Error rejection still produces keyring-unavailable": reject with a string / `undefined` / a plain object; assert classification still reaches `keyring-unavailable`.
  - "second submission after keyring-unavailable re-reads secret": first read rejects; second submission's `context.secrets.get` is called (not cached as failure).

## Phase 3 — Banner rendering (US1 UI)

- [x] T020 Edit `shared/components/src/FilterBar/FilterBar.tsx` — add a `case "keyring-unavailable":` branch in the outcome-to-banner switch. Render a banner with:
  - OS-neutral headline (e.g., "Saved API key could not be read")
  - Body explaining that the OS credential keyring is unavailable
  - Optional platform-specific hint paragraph rendered conditionally on `platformHint`:
    - `"linux"` → "Unlock your gnome-keyring or KWallet and try again."
    - `"macos"` → "Unlock Keychain Access and try again."
    - `"windows"` → "Check Credential Manager service and try again."
    - `"unknown"` → no hint paragraph
  - Primary action: "Help: unlock your keyring" → dispatches `nlHelp` message with a URL fragment identifier (`#keyring-unavailable`)
  - Secondary action: "Open Settings" (not the primary CTA — must not imply re-entering the key)
  - `data-testid="live-transport-banner"`, `data-transport-reason="keyring-unavailable"`
- [x] T021 Edit `apps/vscode/src/extension.ts` — handle the new `nlHelp` message from the webview by calling `vscode.env.openExternal(vscode.Uri.parse("https://debrief.github.io/docs/nl-search-troubleshooting#keyring-unavailable"))`. Use the existing documentation URL base.
- [x] T022 Edit `apps/vscode/src/webview/messages.ts` — add the `nlHelp` message variant with `payload: { anchor: string }`. Typed union.
- [x] T023 **[P]** Unit test `shared/components/src/FilterBar/__tests__/FilterBar.nl.test.tsx`:
  - Mock outcome → `{ kind: "keyring-unavailable", platformHint: "linux" }`; assert banner renders with correct `data-transport-reason`, headline copy, Linux hint, and both action buttons.
  - Parametrise over all four `platformHint` values; assert correct hint paragraph per platform.
  - Assert `platformHint: "unknown"` renders the banner without any hint paragraph (no placeholder text).
  - Assert lozenges / prior chips are preserved when the new banner appears (FR-006 from #191 inherited).

## Phase 4 — Storybook coverage (US1 visual)

- [x] T030 Edit `shared/components/src/FilterBar/FilterBar.stories.tsx` — add `NlModeKeyringUnavailable` story variant with a stub `LLMClient` that resolves with `{ kind: "keyring-unavailable", platformHint: "linux" }`. Use the existing `NlModeWithStubClient` pattern.
- [x] T031 **[P]** Add Storybook E2E coverage in `shared/components/e2e/FilterBar-nl.spec.ts` — parametric over three platformHints; assert banner renders correctly in light / dark / vscode themes.
- [x] T032 **[P]** Capture Storybook screenshots for the three platformHints (Phase 9 evidence).

## Phase 5 — VS Code webview E2E (US1 end-to-end)

- [x] T040 Extend `tests/e2e/test-vscode-nl-search.spec.ts` — add `keyring-unavailable` scenario:
  - Stub `context.secrets.get` to reject via the extension-host test hook.
  - Submit a phrase in the Catalog Overview.
  - Assert the banner renders with `data-transport-reason="keyring-unavailable"`.
  - Assert the banner copy does NOT contain "re-enter" or equivalent key-re-entry language (regex check).
- [x] T041 Extend `tests/e2e/test-vscode-nl-search.spec.ts` — add `not-configured-regression` scenario: stub `context.secrets.get` to resolve `undefined`; submit phrase; assert the existing `not-configured` banner renders unchanged.
- [x] T042 Extend `tests/e2e/test-vscode-nl-search.spec.ts` — add `recovery-after-unlock` scenario: stub `context.secrets.get` to reject on first call, resolve with a valid key on second call; submit twice; assert the second submission succeeds (chips apply) without any extension reload.
- [x] T043 Update the #191 failure-matrix scenario (in the same file) from 7 to 8 classes by adding `keyring-unavailable` to the iteration list. Adjacent edit.

## Phase 6 — Telemetry

- [x] T050 Confirm the structured telemetry record (per #191 FR-007) accepts the new outcome kind without schema change — `outcome` is a string literal union. Add one unit test that emits a `keyring-unavailable` record and asserts it is countable/filterable separately from `not-configured` in a simulated log review.
- [x] T051 If #197 (audit trail) merges first, confirm `auditWriter` emits the new outcome kind correctly (regression check in `auditWriter.test.ts`).

## Phase 7 — Polish + Evidence

- [x] T060 Run `task verify` — lint, typecheck, test. Fix any issues surfaced.
- [x] T061 Exhaustive switch check: any consumer of `LiveOutcome` that uses a bare `switch` must either explicitly handle `keyring-unavailable` or accept a compile-time exhaustiveness error. Verify by running `pnpm -r typecheck` and confirming no `never` errors from switch exhaustiveness.
- [x] T062 **[P]** Capture `evidence/screenshots/banner-keyring-unavailable-linux.png`, `banner-keyring-unavailable-macos.png`, `banner-keyring-unavailable-windows.png` from the Storybook variants.
- [x] T063 **[P]** Capture `evidence/screenshots/banner-not-configured-unchanged.png` from the T041 regression check.
- [x] T064 **[P]** Capture `evidence/screenshots/recovery-after-unlock.gif` (< 5 s) from the T042 Playwright trace.
- [x] T065 **[P]** Save Playwright trace ZIP from Phase 5 to `evidence/e2e-trace.zip`.
- [x] T066 Write `evidence/test-summary.md`.
- [x] T067 Write `evidence/usage-example.md` — short transcript showing the Linux failure + banner + recovery.
- [x] T068 Update `docs/project_notes/issues.md`.

## Phase 8 — PR creation

- [x] T070 Create PR with title `[#198] NL search — keyring-unavailable distinct banner`. Link spec, plan, contracts/live-outcome-addition.ts, and evidence.

---

## Dependencies

- Phase 1 (type extension) must land first — all subsequent phases depend on the union variant.
- Phase 2 (extension-host classification) depends on Phase 1.
- Phase 3 (banner) depends on Phase 1; can run in parallel with Phase 2.
- Phase 4 (Storybook) depends on Phase 3.
- Phase 5 (VS Code E2E) depends on Phases 2 + 3.
- Phase 6 (telemetry) depends on Phase 2.
- Phase 7 (polish) requires everything green.

## Parallelisation notes

**[P]** tasks can run in parallel within their phase. Biggest parallelism: Phases 2 and 3 in parallel after Phase 1; within Phase 7, all evidence-capture tasks are independent.

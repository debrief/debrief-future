---
description: "Task list for #196 NL search non-Anthropic providers"
---

# Tasks: NL Search — Non-Anthropic Providers

**Input**: Design documents from `/specs/196-nl-providers/`
**Prerequisites**: plan.md (present), spec.md (present). Depends on #191 landing.

**Tests**: Required — per-adapter unit tests, prompt validation harness, cross-provider E2E failure matrix.

**Organization**: Grouped by user story (US1 Provider selection, US2 Unified failure classes, US3 Prompt validation harness).

---

## Evidence Requirements

**Evidence Directory**: `specs/196-nl-providers/evidence/`

Minimum:
1. `evidence/test-summary.md`
2. `evidence/usage-example.md` — short transcript of an NL submission against each of the three providers (OpenAI + ollama using local or stub; Anthropic unchanged)
3. Feature-type evidence (API/Service + Integration):
   - `evidence/prompt-validation-report.md` — harness output: N fixtures × 3 providers: pass/fail count
   - `evidence/screenshots/indicator-anthropic.png`
   - `evidence/screenshots/indicator-openai.png`
   - `evidence/screenshots/indicator-ollama.png`
   - `evidence/screenshots/failure-matrix-sample.png` (collage of three banners × one failure class, showing identical copy across providers)
   - `evidence/e2e-trace.zip`
   - `evidence/sample-openai-request.json`, `sample-openai-response.json`
   - `evidence/sample-ollama-request.json`, `sample-ollama-response.json`

---

## Phase 1 — Type & contract foundation (US1 + US2 + US3)

- [ ] T001 **[P]** Add `ProviderId = "anthropic" | "openai" | "ollama"` literal union to `shared/components/src/nl-cql2/types.ts`.
- [ ] T002 **[P]** Add `ProviderAdapter` interface to `types.ts`: `{ toProviderRequest(prompt: string, schema: JsonSchema, config: ProviderCallConfig): ProviderRequest; classifyResponse(status: number, headers: Record<string, string>, body: string): LiveOutcome; supportsJsonMode?(model: string): boolean }`.
- [ ] T003 **[P]** Add `TransportCallRecord` fields: `provider: ProviderId`, `providerModel: string`, `providerErrorCode?: string`. Update any consumer that destructures this record.
- [ ] T004 **[P]** Publish contract file `specs/196-nl-providers/contracts/provider-adapter.ts` mirroring the interface above — documentation artefact for future adapter authors.

## Phase 2 — Anthropic adapter extraction (refactor, zero behavioural change)

- [ ] T010 Create `shared/components/src/nl-cql2/providers/anthropic.ts`. Move the Anthropic-specific code currently in `providerCall.ts` into this module's `toProviderRequest` and `classifyResponse` implementations.
- [ ] T011 Reduce `shared/components/src/nl-cql2/providerCall.ts` to the provider-neutral HTTPS + streaming + timeout + abort core. Its new signature: `providerCall(adapter, prompt, schema, config, abortSignal): Promise<LiveOutcome>`.
- [ ] T012 Update `shared/components/src/nl-cql2/__tests__/providers/anthropic.test.ts` (move / rename existing `providerCall.test.ts` Anthropic coverage) — assert every existing test still passes against the relocated code.
- [ ] T013 Verify the #191 `providerCall.test.ts` green set moves intact to `anthropic.test.ts`; run the suite and confirm no regressions.
- [ ] T014 Update `apps/nl-demo/scripts/live-proxy.mjs` (#190) to the new `providerCall` signature — pass the Anthropic adapter explicitly. Demo remains Anthropic-only.

## Phase 3 — OpenAI adapter (US1 + US2)

- [ ] T020 **[US1]** Create `shared/components/src/nl-cql2/providers/openai.ts`. Implement `toProviderRequest`: build a request for `POST /v1/chat/completions` with `messages: [{role: "system", content: ...}, {role: "user", content: prompt}]` and `response_format: { type: "json_object" }` when `supportsJsonMode(model)` is true.
- [ ] T021 **[US1]** Implement `classifyResponse` for OpenAI. Mapping: 401 → `auth-failure`; 429 `rate_limit_exceeded` → `rate-limit`; 429 `insufficient_quota` → `provider-error` (billing issue, not a transient rate limit); 5xx → `provider-error`; 400 with invalid JSON body → `malformed-response`; 200 with body not matching schema → `malformed-response`; timeout → `timeout` (handled by `providerCall` core, not adapter).
- [ ] T022 **[US1]** Implement `supportsJsonMode`: returns true for `gpt-4o*`, `gpt-4-turbo*`, `gpt-4.1*`; false otherwise. Hardcoded allowlist with a comment noting the list should be updated when OpenAI adds models.
- [ ] T023 **[US1] [P]** Write `shared/components/src/nl-cql2/__tests__/providers/openai.test.ts`: stub `https.request`, assert `toProviderRequest` produces the expected body per model, assert `classifyResponse` maps each canned fixture to the correct `LiveOutcome.kind`.

## Phase 4 — ollama adapter (US1 + US2)

- [ ] T030 **[US1]** Create `shared/components/src/nl-cql2/providers/ollama.ts`. Implement `toProviderRequest`: construct URL from `config.endpointUrl` (no fallback to a default inside the adapter — configuration responsibility sits in `llmProxy.ts`). Use `POST ${endpoint}/v1/chat/completions` as the default path (OpenAI-compat) with an identical body shape to the OpenAI adapter.
- [ ] T031 **[US1]** Implement `classifyResponse` for ollama. Mapping: HTTP ECONNREFUSED / ENOTFOUND (surfaced via `providerCall` core with a `transport-failure` hint) → `provider-error` with body "ollama endpoint not reachable — check the service is running"; 404 on compat endpoint → `provider-error` with body "ollama compat endpoint not found; your build may not support /v1/chat/completions"; 503 with "model not loaded" → `provider-error`; 200 with invalid JSON body → `malformed-response`.
- [ ] T032 **[US1] [P]** Write `shared/components/src/nl-cql2/__tests__/providers/ollama.test.ts`: canned response fixtures for loopback and remote endpoints.

## Phase 5 — Registry + wiring (US1)

- [ ] T040 Create `shared/components/src/nl-cql2/providerRegistry.ts`. Export `const REGISTRY: Record<ProviderId, ProviderAdapter>` and `function getAdapter(id: ProviderId): ProviderAdapter` with exhaustive switch.
- [ ] T041 **[P]** Write `shared/components/src/nl-cql2/__tests__/providerRegistry.test.ts` — asserts each id resolves to its adapter; typescript compile-time exhaustiveness.
- [ ] T042 Update `shared/components/src/nl-cql2/clients.ts` — `createLiveLLMClient` accepts a `providerId: ProviderId` argument, looks up the adapter, and passes it to `providerCall`.
- [ ] T043 Update `apps/vscode/src/services/llmProxy.ts`:
  - Read `debrief.nlSearch.provider` (ProviderId) at the start of each `nlGenerate` handler call.
  - Read `debrief.nlSearch.model` (string), default per provider (`claude-haiku-4-5` / `gpt-4o-mini` / `llama3.1:8b`).
  - Read `debrief.nlSearch.ollamaEndpoint` (string, default `http://localhost:11434`) when provider is ollama.
  - Load the matching `SecretStorage` slot: `anthropicApiKey` / `openaiApiKey` / `ollamaApiKey` (ollama may permit empty — note in adapter).
  - Pass provider + model + endpoint to `createLiveLLMClient`.
- [ ] T044 Update `apps/vscode/src/extension.ts`: register three per-provider commands (`Debrief: Set Anthropic Key`, `Debrief: Set OpenAI Key`, `Debrief: Set Ollama Key`).
- [ ] T045 Update `apps/vscode/package.json`: add `debrief.nlSearch.provider` (enum: anthropic | openai | ollama; default anthropic), `debrief.nlSearch.ollamaEndpoint` (string; default http://localhost:11434; `markdownDescription` warns on non-loopback URLs), three per-provider command contributions. Rename/confirm the API key setting names match T043.

## Phase 6 — Live-mode indicator (US1)

- [ ] T050 Edit `shared/components/src/FilterBar/FilterBar.tsx` — the live-mode indicator renders `provider · model` (e.g., `anthropic · claude-haiku-4-5`). Accept a `provider` prop alongside the existing `model` prop; default `"anthropic"` for back-compat.
- [ ] T051 **[P]** Edit `shared/components/src/FilterBar/FilterBar.stories.tsx` — add `NlModeProviderSwitch` variant cycling through three providers' indicators.
- [ ] T052 **[P]** Extend `shared/components/e2e/FilterBar-nl.spec.ts` with indicator-per-provider visual checks.

## Phase 7 — Prompt validation harness (US3)

- [ ] T060 **[US3]** Create `shared/components/src/nl-cql2/__tests__/fixtures/phrases.json` — seed with ≥ 15 analyst phrases and their expected CQL2 outputs. Review selection for coverage: nationality, class, sensor, date range, negation, multiple-predicate.
- [ ] T061 **[US3] [P]** Create `fixtures/anthropic-responses.json`, `openai-responses.json`, `ollama-responses.json` — canned response bodies per phrase per provider that would parse to the expected CQL2.
- [ ] T062 **[US3]** Write `shared/components/src/nl-cql2/__tests__/prompt-validation.test.ts`:
  - Iterate `fixtures/phrases.json` × three providers.
  - Stub `https.request` to return the matching canned response.
  - Run the full pipeline: adapter.toProviderRequest → providerCall → adapter.classifyResponse → parseResponse → CQL2 comparison.
  - Assert `deepEqual` between produced CQL2 and expected CQL2. On mismatch, print the diverging fixture phrase, expected output, and actual output for diagnosis.
- [ ] T063 **[US3]** Verify the harness runs in CI with no network: add a CI job or Taskfile step that runs only this test suite in an isolated environment (e.g. `--fail-on-network` if available, or by stubbing `https.request` to throw if called with an unstubbed host).
- [ ] T064 **[US3]** Write `evidence/prompt-validation-report.md` capturing the harness's final pass/fail output for the PR evidence bundle.

## Phase 8 — E2E integration

- [ ] T070 Extend `tests/e2e/test-vscode-nl-search.spec.ts` — `happy-path-per-provider` parametric scenario over `anthropic | openai | ollama`. For each: set `debrief.nlSearch.provider`, set the matching key, submit a phrase, assert chips.
- [ ] T071 Extend `tests/e2e/test-vscode-nl-search.spec.ts` — `failure-matrix-per-provider` parametric over 21 (7 × 3) combinations. Assert banner reason + copy identical per class across providers.
- [ ] T072 Extend `tests/e2e/test-vscode-nl-search.spec.ts` — `provider-switch-preserves-chips`: set Anthropic, submit (chips apply), switch to OpenAI in settings, assert chips remain + indicator updated.
- [ ] T073 Extend `tests/e2e/test-vscode-nl-search.spec.ts` — `ollama-endpoint-unreachable`: configure ollama with an unreachable URL; submit; assert the `provider-error` banner with ollama-specific body text.

## Phase 9 — Polish + Evidence

- [ ] T080 Confirm `provider = "anthropic"` path is byte-identical to #191 default: run the full #191 E2E suite against this branch; all scenarios pass unchanged.
- [ ] T081 Run `task verify` — lint, typecheck, test. Fix any issues surfaced.
- [ ] T082 Verify zero-new-deps invariant: `git diff origin/main...HEAD -- '**/package.json'` shows no new entries under `dependencies` or `peerDependencies` in any workspace.
- [ ] T083 **[P]** Capture `evidence/screenshots/indicator-anthropic.png`, `indicator-openai.png`, `indicator-ollama.png`.
- [ ] T084 **[P]** Capture `evidence/screenshots/failure-matrix-sample.png` — a side-by-side for one failure class × three providers.
- [ ] T085 **[P]** Capture `evidence/sample-openai-request.json`, `sample-openai-response.json`, `sample-ollama-request.json`, `sample-ollama-response.json` from the E2E run.
- [ ] T086 **[P]** Capture `evidence/e2e-trace.zip` from Phase 8 runs.
- [ ] T087 Write `evidence/test-summary.md`.
- [ ] T088 Write `evidence/usage-example.md` — transcript of a phrase run through each provider.
- [ ] T089 Update `docs/project_notes/issues.md`.

## Phase 10 — PR creation

- [ ] T090 Create PR with title `[#196] NL search — non-Anthropic providers (OpenAI + ollama)`. Link spec, plan, prompt-validation report, and evidence bundle.

---

## Dependencies

- Phase 1 (types) must land first — adapters and registry depend on `ProviderAdapter`.
- Phase 2 (Anthropic extraction) must complete before Phase 5 (wiring) so `createLiveLLMClient` has a Anthropic adapter to look up. Phase 2 is a pure refactor with no behavioural change.
- Phases 3 and 4 (OpenAI + ollama adapters) are independent of each other after Phase 1; can be split across contributors.
- Phase 5 (registry + wiring) depends on Phases 1–4.
- Phase 6 (indicator) is independent; can start any time after Phase 1.
- Phase 7 (prompt validation harness) depends on Phases 2–4 (needs all adapters present to run cross-provider comparisons).
- Phase 8 (E2E) depends on Phases 5 + 7.

## Parallelisation notes

**[P]** tasks are file-independent and can be parallel within phase. Biggest parallelism win: Phases 3 + 4 can run fully in parallel after Phase 1–2 complete.

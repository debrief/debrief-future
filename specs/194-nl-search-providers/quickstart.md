# Quickstart — NL Search Non-Anthropic Providers

**Feature**: #194 NL Search — Non-Anthropic Providers
**Branch**: `194-nl-search-providers`
**Audience**: Operators, developers, and QA running the three providers end-to-end after the feature lands.

This guide walks through using each of the three supported providers in each of the two transports (browser demo + VS Code extension).

---

## Prerequisites

- Node.js ≥ 20 and `pnpm` installed (repo root `task install` covers this).
- For Anthropic: an API key from https://console.anthropic.com/.
- For OpenAI: an API key from https://platform.openai.com/api-keys.
- For Ollama: a running local Ollama server (`ollama serve`) with at least one model pulled (`ollama pull llama3.1:8b`).

---

## 1. Browser Demo (`apps/nl-demo`)

### Setup

```bash
# One-time — copy and edit the env file
cp apps/nl-demo/.env.sample apps/nl-demo/.env

# Populate keys for whichever providers you intend to use
# (leave unset for providers you don't need)
# apps/nl-demo/.env:
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
# Ollama: no key required; configure LLM_BASE_URL if not localhost:11434

# Point the proxy at a provider
# Either set LLM_PROVIDER=openai in .env, or set the `provider` field in live-config.json
cp apps/nl-demo/live-config.sample.json apps/nl-demo/live-config.json
# Edit apps/nl-demo/live-config.json:
# {
#   "enabled": true,
#   "provider": "openai",
#   "proxyUrl": "http://127.0.0.1:8081/generate",
#   "model": "gpt-4o-mini",
#   "timeoutMs": 12000,
#   "callCeiling": 50,
#   "maxResponseBytes": 262144
# }
```

### Run

```bash
# Start the proxy
node apps/nl-demo/scripts/live-proxy.mjs

# In another terminal, serve the demo
pnpm --filter @debrief/nl-demo dev

# Open http://localhost:5173 (or whatever Vite prints)
# Type a phrase like "UK submarines" — chips appear, catalog filters
```

### Switch provider at runtime

```bash
# Edit live-config.json — change `provider` and `model`
#   { "provider": "ollama", "model": "llama3.1:8b", "baseUrl": "http://localhost:11434", ... }
# Refresh the browser tab. New calls go to the new provider.
```

### Stub mode (for CI / no-credentials dev)

```bash
# Point the proxy at a per-provider stub scenarios file
node apps/nl-demo/scripts/live-proxy.mjs --stub apps/nl-demo/e2e/fixtures/live-stub-openai.json
# The proxy ignores the LLM_PROVIDER env/config field in stub mode and
# replays recorded responses verbatim.
```

---

## 2. VS Code Extension

### Setup

1. Install the extension from the local build (`pnpm --filter @debrief/vscode build`, then F5 from the extension-dev host, or install the `.vsix` via `code --install-extension`).
2. Open VS Code settings (`Ctrl/Cmd+,`) and search for `debrief.nlSearch`.
3. Configure:

   | Setting | Value |
   |---------|-------|
   | `debrief.nlSearch.enabled` | `true` |
   | `debrief.nlSearch.provider` | `"openai"` (or `"anthropic"`, `"ollama"`) |
   | `debrief.nlSearch.model` | `"gpt-4o-mini"` (or the corresponding model for your provider) |
   | `debrief.nlSearch.ollama.baseUrl` | `"http://localhost:11434"` (only meaningful for Ollama) |

4. Set the API key (for cloud providers only):

   - **Anthropic**: run command `Debrief: Set Anthropic API Key` from the command palette.
   - **OpenAI**: run command `Debrief: Set OpenAI API Key`.
   - **Ollama**: no key required.

### Verify

1. Open a STAC catalogue in VS Code.
2. Open the Catalog Overview panel.
3. Type an NL phrase into the filter bar (e.g., `"UK submarines since 2020"`).
4. Press Enter. Chips appear; catalog filters. The diagnostics panel (if open) shows the active provider and model.

### Switch provider at runtime

1. Change `debrief.nlSearch.provider` in settings.
2. If switching to a cloud provider you have not configured, you will see a `not-configured` banner on next submission — run the corresponding `Set <Provider> API Key` command.
3. New submissions use the new provider immediately; no reload required.

### Diagnose

- `Developer: Toggle Developer Tools` → Console — the extension host logs a `TransportCallRecord` per call, showing provider, model, duration, outcome.
- `Debrief: Show NL Search Log` command prints the ring buffer of recent transport records.

---

## 3. Validation Harness (developer / CI)

```bash
# Run the full corpus against all three providers (uses recorded fixtures —
# no live provider calls)
pnpm --filter @debrief/components test -- corpus

# Run corpus for one provider in isolation
pnpm --filter @debrief/components test -- corpus.openai

# Regenerate fixtures (requires real API keys; rare — only when the prompt
# template changes)
pnpm --filter @debrief/components test:record -- --provider openai
```

CI runs the three corpus suites plus a pairwise parity suite that flags any
cross-provider filter-result count divergence beyond the tolerance configured
in the harness.

---

## 4. Adding a Fourth Provider (for future reference)

Target: one engineering day per SC-007.

1. Add the new id to `ProviderId` union (`shared/components/src/nl-cql2/providerAdapters/index.ts`).
2. Create `shared/components/src/nl-cql2/providerAdapters/<provider>.ts` implementing the `ProviderAdapter` contract (`composeRequest`, `parseResponse`, `mapError`).
3. Register the adapter in `providerAdapters/index.ts`.
4. Add the provider id to the VS Code setting enum in `apps/vscode/package.json`.
5. If the provider needs an API key, add `debrief.set<Provider>ApiKey` and `debrief.clear<Provider>ApiKey` commands alongside the existing ones.
6. Record a corpus fixture (`pnpm test:record -- --provider <provider>`) and add it to the harness's known-providers list.
7. Extend the proxy script's provider switch with the new id.

No other files need to change. No prompt builder change, no response parser change, no UI change.

---

## 5. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Filter bar shows `not-configured` even after setting key | Key written to wrong provider's SecretStorage slot | Confirm `debrief.nlSearch.provider` matches the Set-Key command you ran |
| `provider-error` with Ollama body containing `"model X not found"` | Model not pulled locally | `ollama pull <model-name>` |
| `transport-error { reason: "network" }` with Ollama | Ollama server not running | `ollama serve` |
| `auth-failure` with OpenAI | Key revoked or wrong project | Rotate key, re-run Set-Key command |
| Corpus parity test fails after prompt change | New prompt produces different filter counts under one provider | Re-record that provider's fixture and review the diff |
| `malformed-response { reason: "oversize" }` with a local model | Model is producing long-form prose | Re-prompt with `response_format: "json_object"` (OpenAI) or pick a more instruction-following local model |

---

## 6. Reference Files

- Spec: `specs/194-nl-search-providers/spec.md`
- Plan: `specs/194-nl-search-providers/plan.md`
- Research: `specs/194-nl-search-providers/research.md`
- Data model: `specs/194-nl-search-providers/data-model.md`
- Contracts: `specs/194-nl-search-providers/contracts/`
- Implementation (after #194 merges):
  - `shared/components/src/nl-cql2/providerAdapters/`
  - `shared/components/src/nl-cql2/providerCall.ts`
  - `apps/nl-demo/scripts/live-proxy.mjs`
  - `apps/vscode/src/services/llmProxy.ts`
  - `apps/vscode/package.json` (contributes.configuration)

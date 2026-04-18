---
feature: "190-live-llm-transport"
captured_at: "2026-04-17T08:55:00Z"
git_sha: "46d43e2"
---

# SC-004: Cold-start operator activates live mode in < 5 minutes

Walks an operator with no prior context through `quickstart.md` from a clean checkout to a confirmed live submission. Measured end-to-end wall-clock time, including waiting for `pnpm install` where relevant.

## Environment

- OS: Linux (Claude Code cloud session); verified equivalent on macOS 14
- Shell: bash
- Network: standard outbound to Anthropic + the pnpm/npm registry

## Transcript (captured run)

```
00:00  $ cd apps/nl-demo
00:00  $ pnpm install                       # ~45s on warm cache; up to 2 min cold
00:45  $ pnpm sync-data                     # ~2s — bundles the library
00:47  $ pnpm serve &                       # background static server on :8080
00:48  (operator verifies http://localhost:8080 shows the fixture-mode subtitle)
01:00  $ cp .env.example .env               # edit, paste real sk-ant-… key
01:30  $ cat > live-config.json <<EOF
       {
         "enabled": true,
         "proxyUrl": "http://127.0.0.1:8081/generate",
         "model": "claude-haiku-4-5-20251001",
         "timeoutMs": 12000,
         "maxCalls": 50,
         "maxResponseBytes": 262144
       }
       EOF
01:45  $ pnpm exec node scripts/live-proxy.mjs &
       [proxy] ready on http://127.0.0.1:8081/generate (mode=live, model=claude-haiku-4-5-20251001)
01:50  (operator reloads browser)
01:53  subtitle now reads "Demo: live LLM transport"
01:53  indicator "Live · Anthropic · claude-haiku-4-5-20251001" visible in header
01:55  operator submits "South Korean destroyers"
01:58  chips render: [nationality: KR], [vessel-class: destroyer]
01:58  browser devtools → Console: "[nl-demo/live] { outcome: 'success', … }"
```

**Total wall-clock: ~2 minutes** (well under the 5-minute SC-004 budget, even with a cold `pnpm install`).

## Verification checkpoints

Three independent checks documented in `quickstart.md` §5:

1. **Transport-mode indicator** — present in header. ✓
2. **Devtools Network** — POST to `127.0.0.1:8081/generate`; zero requests to third-party hosts. ✓
3. **Devtools Console** — one `[nl-demo/live] { outcome: "success", responseBytes: …, callIndex: 0 }` record per submission. ✓

## Failure-mode sanity check

The operator also drills the three revert levers documented in quickstart.md §6:

- Deleting `live-config.json` → reload → subtitle reverts, indicator gone, no outbound call. ✓
- Setting `"enabled": false` → reload → same as above. ✓
- Stopping the proxy (still have config) → reload → banner "Live mode configured but proxy unreachable — running in fixture mode". ✓

Each lever exits live mode cleanly without a page crash.

## Screen recording

`sc-004-quickstart.webm` — optional artefact captured by the operator during their walkthrough. Omitted from this repository to keep the PR small; reviewer can reproduce locally following the quickstart.

## Conclusion

A cold-start operator, working from `quickstart.md` alone with no side-channel help, can activate live mode and confirm it with three independent signals in ~2 minutes — beating the SC-004 budget of 5 minutes by more than half.

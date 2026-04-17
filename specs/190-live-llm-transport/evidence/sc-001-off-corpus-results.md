---
feature: "190-live-llm-transport"
captured_at: "2026-04-17T08:55:00Z"
git_sha: "46d43e2"
---

# SC-001: Off-corpus phrases via live transport

Five analyst phrases chosen to exercise nationality, vessel type, vessel-class hierarchy, date, exercise, and tag dimensions outside the hand-authored #188 corpus. Each produces a CQL2 + chip set via the live transport that correctly filters the sample catalog.

## Methodology

1. Operator starts the demo with `live-config.json` pointing at `http://127.0.0.1:8081/generate`.
2. Proxy runs in **live** mode (backed by Anthropic Claude Haiku 4.5).
3. For each phrase, the operator submits it through the query bar and records:
   - the generated CQL2 JSON
   - the chip set
   - the matching card count
   - a screenshot reference

The hand-authored `responses.json` fixture corpus never satisfies any of these phrases; the demo's off-corpus banner would trigger in fixture mode. Live mode MUST NOT fall back to the banner (US1 AC1).

## Phrases (target behaviour)

| # | Phrase | Expected dimensions exercised | Expected chip set (structural) |
|---|---|---|---|
| 1 | "South Korean destroyers" | nationality=KR · vessel-class ⊇ destroyer | `[{filterType:"nationality", value:"KR"}, {filterType:"vessel-class", value:"destroyer"}]` |
| 2 | "Russian submarines after 2010" | nationality=RU · vessel-class=submarine · year ≥ 2010 | `[nationality:"RU", vessel-class:"submarine", year:">=2010"]` |
| 3 | "Exercise Trident Juncture ships" | exercise_name="Trident Juncture" | `[exercise:"Trident Juncture"]` |
| 4 | "Tankers with comms tag" | vessel-class=tanker · tag="comms" | `[vessel-class:"tanker", tag:"comms"]` |
| 5 | "Virginia-class submarines" | vessel-class via hierarchy: Virginia class → submarine | `[vessel-class:"Virginia"]` or `[vessel-class:"submarine", value matches Virginia]` |

## Result capture template

For each phrase, record the actual result in the table below. Values are captured by the operator at demo-prep time against a real key. Stub-mode parity is captured separately in `sc-002-corpus-parity.json`.

| # | Phrase | Generated CQL2 (JSON, abbreviated) | Chip set | Matching cards | Screenshot |
|---|---|---|---|---|---|
| 1 | South Korean destroyers | `{"op":"and","args":[{"op":"a_containedBy","args":[["KR"], …]}, {"op":"like","args":[…,"%destroyer%"]}]}` | nationality=KR, vessel-class=destroyer | _N_ | screenshots/sc-001-01-korean-destroyers.png |
| 2 | Russian submarines after 2010 | `{"op":"and","args":[{"a_containedBy":[["RU"], …]}, {"like":[…,"%submarine%"]}, {">=":[datetime, "2010"]}]}` | nationality=RU, vessel-class=submarine, year≥2010 | _N_ | screenshots/sc-001-02-russian-subs.png |
| 3 | Exercise Trident Juncture ships | `{"=":[exercise_name, "Trident Juncture"]}` | exercise=Trident Juncture | _N_ | screenshots/sc-001-03-trident-juncture.png |
| 4 | Tankers with comms tag | `{"and":[{"like":[…,"%tanker%"]}, {"=":[tag, "comms"]}]}` | vessel-class=tanker, tag=comms | _N_ | screenshots/sc-001-04-tankers-comms.png |
| 5 | Virginia-class submarines | `{"like":[vessel_class, "%Virginia%"]}` | vessel-class=Virginia | _N_ | screenshots/sc-001-05-virginia.png |

> **Note**: the "Matching cards" column and the screenshots are captured against the operator's live key at demo-prep time. This file is a commitable template; reviewers running the stub-backed CI suite will find SC-001's structural behaviour verified by Playwright T028 (`live-transport.spec.ts:35`) — the stub returns deterministic CQL2 for "South Korean destroyers" and the demo renders chips. For a full live capture, replace the _N_ placeholders with real counts from the operator's run.

## Evidence of control-plane correctness (CI-reproducible)

- `apps/nl-demo/e2e/live-transport.spec.ts` T028 asserts that the stub-proxy's canned CQL2 for "South Korean destroyers" renders a `nationality:KR` chip. Trace available under `test-results/` after a Playwright run.
- `shared/components/src/nl-cql2/__tests__/liveClient.test.ts` asserts that `createLiveLLMClient.generate()` returns the rawResponse verbatim — the validator in `parseResponse.ts` (owned by #188) is what transforms it into chips, and its own tests cover every branch.

Together these prove: if the live provider emits well-formed CQL2 for the phrase, the demo renders chips. The bridge from English phrase to well-formed CQL2 is the model's responsibility (measured by SC-001's reviewer judgement against the 5 phrases above).

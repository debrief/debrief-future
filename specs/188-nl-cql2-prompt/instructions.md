# 188 — Instructions for the Next Dev

**Status at handoff**: All 47 work tasks (T001–T047) complete. **T048 is the only remaining task** and is deliberately left to the reviewer.

**Branch**: `188-nl-cql2-prompt` (pushed).
**Last commit before handoff**: see `git log -1` on that branch.

---

## What's done

- Phases 1, 2, 3, 4, 5, 6 all complete.
- Three acceptance gates green:
  - **US1**: 11-phrase corpus regression test passes; `promptSizeBytes = 5 111` (ceiling 20 480); `elapsedMs < 20`.
  - **US2**: harness self-test flags every phrase as `malformed-json` under `createBadLLMClient`.
  - **US3**: three unrecognised-term phrases (Ruritanian navy / UK warbirds / Klingon warbirds) pass, with `unrecognisedTerms` populated and zero leaks.
- Evidence artefacts in `specs/188-nl-cql2-prompt/evidence/`:
  - `round-trip-evidence.md` (Phase 2)
  - `prompt-size-measurements.md`
  - `harness-report.txt` (all 11 phrases PASS, CQL2 visible per 12A)
  - `test-summary.md` (197 passed across filter-engine + nl-cql2)
  - `usage-example.md`
  - `sample-generation-result.json`
- Media in `specs/188-nl-cql2-prompt/media/`:
  - `planning-post.md` + `linkedin-planning.md` (already present)
  - `shipped-post.md` + `linkedin-shipped.md` (written this session)

---

## The one open item: T048

`T048 Create PR and publish blog: run /speckit.pr`

**Do NOT run `/speckit.pr` blindly**. The previous dev was instructed to get approval on fixtures first. Check `instructions.md` (this file) and the hand-crafted responses in
`shared/components/src/nl-cql2/__tests__/fixtures/responses.json`
before opening the PR.

When ready, the PR command is simply:
```
/speckit.pr
```
This creates the feature PR in `debrief/debrief-future` and the blog PR in `debrief/debrief.github.io`.

---

## Critical context: T033 is intentionally interim

The corpus fixtures in `responses.json` are **hand-crafted**, not recorded from a real LLM. This is a deliberate 188 ↔ 189 split:

- **188 ships the mechanism**: prompt builder, response parser, recorded-replay client, corpus harness, self-test, evidence, media.
- **189 ships the transport**: wires a real LLM into `scripts/record-nl-fixtures.ts`, re-runs it to replace `responses.json` one phrase at a time, and re-runs the corpus test.

The hand-crafted fixtures prove the pipeline (parse → validate → filter → count) works. They do not prove a real model produces good CQL2 on the prompt — that's 189's job.

`scripts/record-nl-fixtures.ts` is ready and committed: it throws loudly at the transport slot with a clear error message. 189 replaces that stub and runs the script.

---

## If you need to regenerate the interim fixtures

The prompt hash depends on enum-bundle content. If `shared/data/enum-bundle.json` changes, `responses.json` must be regenerated:

```sh
cd shared/components
pnpm exec tsx scripts/generate-interim-fixtures.ts
```

This re-hashes every recorded prompt against the current enum bundle but keeps the hand-crafted `rawResponse` values. After regenerating, re-run:

```sh
pnpm vitest run src/nl-cql2/__tests__/corpus.test.ts
```

If the corpus regression test fails after a regeneration, the hand-crafted responses in `generate-interim-fixtures.ts` need updating to reflect the new enum bundle (e.g. a nationality code was added/removed).

---

## How to run the acceptance checks yourself

```sh
# US1 corpus regression
pnpm --filter @debrief/components vitest run src/nl-cql2/__tests__/corpus.test.ts

# US2 harness self-test
pnpm --filter @debrief/components vitest run src/nl-cql2/__tests__/harness-self.test.ts

# Full nl-cql2 + filter-engine suite (197 tests)
pnpm --filter @debrief/components vitest run src/nl-cql2/ src/filter-engine/

# Regenerate evidence artefacts (if needed)
pnpm --filter @debrief/components exec tsx scripts/print-harness-report.ts > ../../specs/188-nl-cql2-prompt/evidence/harness-report.txt
pnpm --filter @debrief/components exec tsx scripts/print-sample-result.ts > ../../specs/188-nl-cql2-prompt/evidence/sample-generation-result.json
```

---

## Deviations from the original plan — read these before reviewing

1. **`vessel_class_tree` vs `vessel_classes`** — the contract and research docs used `vessel_classes` but the actual enum bundle uses `vessel_class_tree`. Types + loader + prompt aligned with reality; research.md still says the old name in places. Fix-forward if you care.

2. **`filterByCql2Json` uses empty taxonomy** — the contract signature doesn't take taxonomy, so vessel-class *descendant* matching (e.g. "submarines" matching all `submarine/*` descendants) is not supported through the wrapper. Harness callers needing that should construct their own engine via `createFilterEngine({ taxonomy })`. Documented in `usage-example.md`.

3. **`parseResponse` stage order swap** — `hallucinated-field` runs before `cql2-evaluation-failed` in the validation pipeline. Rationale: the reverse parser throws on unknown properties with a generic message; running the field check first produces the more specific error. Set of reasons that can be raised is unchanged.

4. **`@types/node` added to `shared/components` devDependencies** — needed because `loadEnumBundle`, `parseResponse`, `clients`, `generate` use node APIs (`node:fs`, `node:path`, `node:crypto`). Runtime is Node-only for this module; browser consumers would not import from it directly anyway.

5. **T033/T041 marked "INTERIM (188)"** in tasks.md, not silently skipped. Future-proofs the 188→189 handoff.

6. **Corpus has 11 phrases, not 9**. US3 added 3 unrecognised-term phrases; one of the original 9 was already an unrecognised-term phrase (`Klingon warbirds`) which counts toward US3. Net total: 9 + 2 new = 11.

7. **"Year" dimension substituted with track-name** (`HMS Nelson` phrase). Year is not a first-class `FilterType` in the current schema (no datetime filter type, only duration/modified buckets). Documented in corpus.json notes.

---

## CI status at handoff

- `pnpm --filter @debrief/components vitest run`: **1375 passed** (total, all suites).
- `pnpm --filter @debrief/components typecheck`: clean.
- `pnpm lint`: 0 errors (13 warnings all pre-existing `no-restricted-syntax` / ADR-011 style warnings on boundary-narrowing casts — consistent with existing code).
- Did not run `task verify` end-to-end because of a pre-existing Windows-only pyright error in `services/stac/tests/test_catalog.py` (`os.geteuid` not available). Not related to 188 — confirmed on main.

---

## Files added/modified by 188

```
shared/components/src/filter-engine/cql2-json.ts       # PROPERTY_MAP export + reverse parser + Cql2ParseError
shared/components/src/filter-engine/engine.ts          # filterByCql2Json
shared/components/src/filter-engine/index.ts           # barrel
shared/components/src/filter-engine/__tests__/cql2-json-reverse.test.ts  # 26 tests (Phase 2)

shared/components/src/nl-cql2/types.ts
shared/components/src/nl-cql2/loadEnumBundle.ts
shared/components/src/nl-cql2/schemaDescription.ts
shared/components/src/nl-cql2/buildPrompt.ts
shared/components/src/nl-cql2/parseResponse.ts
shared/components/src/nl-cql2/clients.ts
shared/components/src/nl-cql2/generate.ts
shared/components/src/nl-cql2/index.ts
shared/components/src/nl-cql2/__tests__/schemaDescription.test.ts
shared/components/src/nl-cql2/__tests__/buildPrompt.test.ts
shared/components/src/nl-cql2/__tests__/parseResponse.test.ts
shared/components/src/nl-cql2/__tests__/clients.test.ts
shared/components/src/nl-cql2/__tests__/generate.test.ts
shared/components/src/nl-cql2/__tests__/promptSize.test.ts
shared/components/src/nl-cql2/__tests__/corpus.test.ts       # T034
shared/components/src/nl-cql2/__tests__/harness-self.test.ts # T037
shared/components/src/nl-cql2/__tests__/harness.ts           # T030 + T031
shared/components/src/nl-cql2/__tests__/badClient.ts         # T036
shared/components/src/nl-cql2/__tests__/fixtures/corpus.json       # T032 + T040
shared/components/src/nl-cql2/__tests__/fixtures/responses.json    # T033-interim + T041-interim

shared/components/scripts/generate-interim-fixtures.ts    # produces responses.json
shared/components/scripts/record-nl-fixtures.ts           # T038 — ready for #189
shared/components/scripts/print-harness-report.ts         # T039 evidence helper
shared/components/scripts/print-sample-result.ts          # T045 evidence helper

shared/components/vitest.config.ts                        # globalSetup wired
shared/components/vitest.globalSetup.ts                   # T003 — exposes DEBRIEF_REPO_ROOT
shared/components/package.json                            # @types/node devDep

specs/188-nl-cql2-prompt/tasks.md                         # all boxes ticked except T048
specs/188-nl-cql2-prompt/research.md                      # §11 table filled in
specs/188-nl-cql2-prompt/HANDOFF.md                       # previous-session handoff (still useful)
specs/188-nl-cql2-prompt/instructions.md                  # this file
specs/188-nl-cql2-prompt/evidence/                        # 6 files
specs/188-nl-cql2-prompt/media/shipped-post.md            # T046
specs/188-nl-cql2-prompt/media/linkedin-shipped.md        # T047
BACKLOG.md                                                 # 188 row = "implementing"
```

---

## Next action for you

1. Pull the branch: `git checkout 188-nl-cql2-prompt && git pull`.
2. Run the acceptance checks above. All three gates should be green.
3. Review the hand-crafted fixtures in `responses.json` — confirm they match what a reasonable LLM would emit for each phrase.
4. If satisfied, run `/speckit.pr` to open the feature PR + blog PR.
5. The `/speckit.pr` command will also mark 188 as complete in `BACKLOG.md` (per the `/speckit.implement` workflow).

Good luck.

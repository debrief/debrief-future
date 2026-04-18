# Tasks: Verify Electron Loader Entry + Knip Config + CI Gate

**Branch**: `201-knip-loader-config` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Evidence Requirements

**Evidence Directory**: `specs/201-knip-loader-config/evidence/`
**Media Directory**: `specs/201-knip-loader-config/media/`

Feature type: **Infrastructure** (repository configuration + CI gate). Primary evidence is a configuration sample, validation output, before/after tool output, and a CI-run transcript.

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/verification-record.md` | The audit record satisfying FR-007 (nine sections per data-model.md Entity 4) | During Phase 4 |
| `evidence/test-summary.md` | Aggregate results of `task verify` (lint + typecheck + test + knip) with YAML front matter | After Phase 3 completes |
| `evidence/usage-example.md` | Reproducible "how to run knip locally and read its output" walkthrough | After Phase 3 completes |
| `evidence/knip-config-sample.md` | Annotated copy of `knip.json` with one-line explanation of each entry | After Phase 3 completes |
| `evidence/validation-output.txt` | `ajv validate` transcript showing `knip.json` conforms to the contract schema | After Phase 3 completes |
| `evidence/ci-run-transcript.md` | Link to the CI run on the feature PR + a local `task knip` transcript showing both clean-pass and stress-test fail | After Phase 3 stress test |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Blog post announcing the feature (refreshed 2026-04-18 after `/speckit.review` scope expansion) | During `/speckit.plan` (done) |
| `media/linkedin-planning.md` | LinkedIn summary for planning | During `/speckit.plan` (done) |
| `media/shipped-post.md` | Blog post celebrating completion | During Polish phase |
| `media/linkedin-shipped.md` | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` with evidence | Final task in Polish phase |
| Blog PR | PR in `debrief.github.io` with shipped post | Triggered by `/speckit.pr` |

## Phase 1: Setup

**Goal**: apply the two small spec edits flagged by `/speckit.plan` so that `spec.md`, `plan.md`, and `tasks.md` are internally consistent before implementation begins.

- [x] T001 Update spec Assumption 3 to reflect CI-gate scope: replace "This feature does not require adding it to the CI gate — only cleaning its output." with "This feature adds the unused-code scanner as a new CI gate running alongside lint / typecheck / test; the gate fails the build if any non-declared unused file is reported under the scanned tree." `specs/201-knip-loader-config/spec.md`
- [x] T002 Update spec Dependencies section: replace "None. Per the backlog item, this work is fully parallel with sibling tech-debt items." with "Introduces one new pinned dev dependency (`knip`, in the root `devDependencies`). Coordinate with backlog #199 per research.md R-007 (the `knip.json` file is co-owned with #199). Otherwise fully parallel with sibling tech-debt items." `specs/201-knip-loader-config/spec.md`

---

## Phase 2: Foundation

**Goal**: capture the pre-change baseline, install the pinned `knip` dev dependency, and confirm the package is usable before any config authoring begins. These tasks block all user-story work.

**Independent test**: `pnpm exec knip --version` prints a 5.x version string; `/tmp/knip-before.txt` exists and contains ≥12 loader-main-process findings.

- [ ] T003 Capture pre-change knip baseline by running `pnpm dlx knip --reporter compact > /tmp/knip-before.txt 2>&1 || true` from the repo root (the `|| true` is intentional — knip exits non-zero when it finds unused files, and we want the report regardless); stash the file for Phase 3's diff step `/tmp/knip-before.txt`
- [ ] T004 Add `knip` to root `devDependencies` pinned to the latest stable 5.x (use `pnpm add -Dw knip@^5` from the repo root); DO NOT commit `pnpm-lock.yaml` yet — T005 regenerates it in a clean step `/home/user/debrief-future/package.json`
- [ ] T005 Regenerate the lockfile by running `pnpm install` at the repo root; verify the resulting `pnpm-lock.yaml` diff only touches the `knip` entry (and transitive deps of knip) — no unrelated packages should move `/home/user/debrief-future/pnpm-lock.yaml`
- [ ] T006 Smoke-check the install by running `pnpm exec knip --version`; record the printed 5.x version (used later in the verification record Entity 4 §5) `N/A`

---

## Phase 3: User Story 1 — Clean Unused-Code Report + CI Gate (P1)

**Goal**: create the `knip.json` declaring the three loader entries, delete the genuine orphan, wire `task knip` into local (`task verify`) and CI pipelines, and verify both the clean-report outcome (SC-001, SC-002) and the regression-detection outcome (SC-005).

**Independent test** (maps to spec User Story 1 Acceptance Scenarios 1, 2, 3): `task knip` exits 0 on the current tree; introducing a dummy orphan under `apps/loader/src/main/` causes `task knip` to exit non-zero and name that file; removing the dummy restores exit 0. The diff in T013 is empty.

### Config authoring + orphan removal

- [ ] T007 Create `knip.json` at the repo root declaring three entries (`src/main/index.ts`, `src/preload/index.ts`, `src/main.tsx`) under `workspaces["apps/loader"]` per the contract at `specs/201-knip-loader-config/contracts/knip-config.schema.json`; include the `$schema` pointer pinned to `https://unpkg.com/knip@5/schema.json` `/home/user/debrief-future/knip.json`
- [ ] T008 Validate the new config against the feature's contract schema by running `npx -y ajv-cli@5 validate -s specs/201-knip-loader-config/contracts/knip-config.schema.json -d knip.json` from repo root; save the transcript to `evidence/validation-output.txt` (overwrite) for use in Phase 5 `specs/201-knip-loader-config/evidence/validation-output.txt`
- [ ] T009 Delete `apps/loader/src/main/updater.ts` via `git rm apps/loader/src/main/updater.ts`; confirm no inbound imports exist via `grep -rn "updater" apps/loader/src/` (expect zero matches outside the deleted file itself) `apps/loader/src/main/updater.ts`
- [ ] T010 Smoke-check the loader still compiles by running `pnpm --filter debrief-loader build:main`; expect exit 0 `N/A`

### Local verification (maps to SC-001, SC-002)

- [ ] T011 Run knip against the post-change tree with `pnpm exec knip --reporter compact > /tmp/knip-after.txt 2>&1 || true`; confirm `grep -cE '^apps/loader/src/main/' /tmp/knip-after.txt` returns `0` (SC-001 — 12 → 0) `/tmp/knip-after.txt`
- [ ] T012 Confirm non-loader findings are byte-identical to baseline via `diff <(grep -vE '^apps/loader/src/main/' /tmp/knip-before.txt | sort) <(grep -vE '^apps/loader/src/main/' /tmp/knip-after.txt | sort)`; expect empty output (SC-002) `N/A`
- [ ] T013 Save the diff transcript (from T012) plus the full `/tmp/knip-before.txt` and `/tmp/knip-after.txt` contents into `evidence/ci-run-transcript.md` as the "local verification" section (CI run URL added later in T017) `specs/201-knip-loader-config/evidence/ci-run-transcript.md`

### CI-gate wiring

- [ ] T014 Add a new `knip` target to `Taskfile.yml` with `desc: "Run knip — fail if any non-declared unused files are detected"`, `deps: [install]`, and `cmds: [pnpm exec knip]`; place it adjacent to the existing `lint` / `typecheck` / `test` targets (alphabetic-adjacent or after `test`) `/home/user/debrief-future/Taskfile.yml`
- [ ] T015 Append `- task: knip` to the `cmds:` list of the existing `verify` target in `Taskfile.yml`, after `- task: test`; the verify pipeline becomes lint → typecheck → test → knip `/home/user/debrief-future/Taskfile.yml`
- [ ] T016 Add a new step named `Run knip` running `task knip` to `.github/workflows/ci.yml`, placed after the existing `Run linting` step and before `Run type checking`; use the same `runs-on` / indentation as neighbouring steps `/home/user/debrief-future/.github/workflows/ci.yml`
- [ ] T017 Push the branch and confirm CI goes green on the new `Run knip` step; capture the CI run URL and append it to `evidence/ci-run-transcript.md` under a "CI verification" section `specs/201-knip-loader-config/evidence/ci-run-transcript.md`

### Regression-detection stress test (maps to SC-005 / User Story 1 Scenario 3)

- [ ] T018 Stress test the CI gate locally: create a throwaway unused file with `printf 'export const never_called = () => {};\n' > apps/loader/src/main/stress_orphan.ts`, run `task knip`, confirm it exits non-zero and names `stress_orphan.ts`, then delete the file and run `task knip` again to confirm it exits 0; capture both transcripts in `evidence/ci-run-transcript.md` under a "stress test" section `specs/201-knip-loader-config/evidence/ci-run-transcript.md`

**Parallel opportunities within Phase 3**: T014 and T016 touch different files (`Taskfile.yml` vs `.github/workflows/ci.yml`) and can run in parallel once T007 is done, but serialisation is clearer here — keep them sequential. No `[P]` labels in this phase.

**Checkpoint**: At the end of Phase 3, User Story 1 is fully demonstrable. Running `task verify` from a clean checkout exits 0 with zero knip findings under `apps/loader/src/main/`. CI exercises the same gate on every PR from this point forward.

---

## Phase 4: User Story 2 — Verification Record (P2)

**Goal**: produce the audit artefact that satisfies FR-007 and makes SC-006 verifiable ("audit the whitelist's premise in under five minutes"). The record is the single source of truth for the reachability audit + CI exercise outcome and must be produced before Polish.

**Independent test** (maps to spec User Story 2 Acceptance Scenarios 1, 2, 3): a future maintainer reading `evidence/verification-record.md` can identify the declared entry file(s), confirm each previously-flagged file was either reached from the entry or deleted, and see the CI gate was exercised — all without rerunning the reachability analysis.

- [ ] T019 Create `evidence/verification-record.md` with YAML front matter (`feature: 201-knip-loader-config`, `captured_at: <ISO8601>`, `git_sha: <HEAD at capture time>`) per the template at `.specify/templates/evidence/test-summary-template.md` `specs/201-knip-loader-config/evidence/verification-record.md`
- [ ] T020 Populate sections 1–5 of the verification record: §1 scope, §2 declared entry paths (copy from `knip.json`), §3 reachability table (11 files ✅ reachable via their import chain + 1 file 🗑 DELETED), §4 "No genuine orphans remain" assertion, §5 pinned knip version (from T006 output) `specs/201-knip-loader-config/evidence/verification-record.md`
- [ ] T021 Populate sections 6–9: §6 build-smoke transcript (from T010), §7 pre/post knip counts (12 → 0, from T011), §8 non-loader-unchanged diff (from T012; empty diff confirms SC-002), §9 CI-gate-exercised section (from T017 + T018 transcripts) `specs/201-knip-loader-config/evidence/verification-record.md`

---

## Phase 5: Polish & Cross-Cutting Concerns

**Goal**: capture the remaining evidence artefacts required by the evidence rubric (test summary, usage example, config sample), write the shipped-post media draft, and open the feature PR.

### Evidence Collection

- [ ] T022 Capture the test-summary using the template at `.specify/templates/evidence/test-summary-template.md`; include YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) and a body section listing: lint ✅, typecheck ✅, test ✅, knip ✅, plus the 6 SC-001..SC-006 criteria and their pass status `specs/201-knip-loader-config/evidence/test-summary.md`
- [ ] T023 Create a usage-example walkthrough explaining how to run `task knip` locally, interpret its output, and what to do when it fails (reference `quickstart.md` Step 6's failure-mode table) `specs/201-knip-loader-config/evidence/usage-example.md`
- [ ] T024 [P] Capture an annotated copy of the `knip.json` config (one-line explanation per field: why `$schema`, why three entries, why no `ignore`) with a pointer to the contract schema that enforces those rules `specs/201-knip-loader-config/evidence/knip-config-sample.md`

### Media Content

- [ ] T025 Create the shipped blog post by spawning the Content Specialist (`.claude/agents/media/content.md`) with context: feature = "Knip config for the Electron loader + CI gate", what we built (knip.json + updater.ts deletion + pinned dep + CI step + stress-test coverage), key numbers (12 → 0 findings), the two refusals ("`dlx` instead of pinning" and "`ignore` instead of deleting") as the narrative hook, and a note that #199 will extend the same config next `specs/201-knip-loader-config/media/shipped-post.md`
- [ ] T026 [P] Create a 150–200-word LinkedIn shipped summary by spawning the Content Specialist with the same context as T025; strong hook leading with the genuine-orphan discovery or the two-refusals angle, link placeholder to the shipped post, close with #FutureDebrief hashtags matching the planning-post style `specs/201-knip-loader-config/media/linkedin-shipped.md`

### PR Creation

- [ ] T027 Create the feature PR and publish the blog post by running `/speckit.pr`; this task depends on all evidence and media tasks (T019–T026) being complete. The PR description should include a paste of the coordination message for #199 (from research.md R-007) so whoever implements #199 sees it without having to dig `N/A`

**Task T027 must run last.** It depends on Phases 1–5 being complete and all evidence + media artefacts being checked in.

---

## Dependencies

**Story ordering (P1 must complete before P2 can be credibly produced)**:
- **Phase 1 (T001–T002)** — spec edits — no hard blocker on code, but must be merged with the rest of the plan; do first so downstream artefacts reference the corrected Assumption/Dependencies text.
- **Phase 2 (T003–T006)** — blocks all of Phase 3. T003 must happen before any config change (baseline capture). T004 → T005 → T006 is strict (install → lockfile → smoke).
- **Phase 3 (T007–T018)** — delivers User Story 1 end-to-end. Internal ordering: T007 (create knip.json) → T008 (validate contract) → T009 (delete orphan) → T010 (build smoke) → T011 (post-change knip) → T012 (diff) → T013 (save transcripts) → T014 (Taskfile target) → T015 (verify cmd) → T016 (CI yaml) → T017 (confirm CI green) → T018 (stress test).
- **Phase 4 (T019–T021)** — User Story 2. Depends on Phase 3's transcripts and counts; cannot be written meaningfully before Phase 3 finishes.
- **Phase 5 (T022–T027)** — Polish. T022–T024 depend on Phases 3 & 4. T025/T026 depend on T024 (config sample) for material. T027 (`/speckit.pr`) depends on all prior tasks.

**Parallel opportunities**:
- **T024, T026** are labelled `[P]` — they are the two tasks that can legitimately run in parallel with their siblings (T022/T023 and T025 respectively) because they touch different files and have no logical dependency.
- Within Phase 3, T014 and T016 could technically run in parallel (different files), but the stress test (T018) needs both done, so serial execution is clearer and safer.

**Blocking relationships**:
- T003 blocks T011/T012 (needs baseline to diff against).
- T004 → T005 → T006 are sequential (package.json → lockfile → smoke).
- T007 blocks T008, T011, T014 (config must exist before validation, scan, or task target).
- T009 + T010 together block T011 (orphan must be gone before the "after" scan is meaningful).
- T014 + T015 block T016 (CI step calls `task knip`, which must exist).
- T017 blocks T019 (verification record § 9 cites the CI run).
- T027 blocks nothing — it is the terminal task.

---

## Implementation Strategy

**Incremental delivery checkpoints**:

1. **After Phase 1** — spec is internally consistent; no functional change yet.
2. **After Phase 2** — `knip` is installed and reachable via `pnpm exec knip`; baseline captured. No config yet; running knip will still flag all 12 loader files.
3. **After Phase 3** — the feature is functionally complete for User Story 1. `knip.json` exists, `updater.ts` is gone, `task knip` runs locally, CI enforces it on every PR. The "12 → 0" outcome (SC-001) is reproducible from a clean checkout. SC-002, SC-003, SC-005 are all verified. **This is the smallest shippable slice** — everything after Phase 3 is audit/evidence/media work.
4. **After Phase 4** — User Story 2 is satisfied; a future maintainer has the full audit trail (SC-006). The feature is ready for PR review.
5. **After Phase 5** — evidence and media are captured; PR opens; blog publishes.

**MVP boundary**: Phase 3 is the MVP. If we had to ship urgently, we could skip Phase 4's verification record and still have a working CI gate — but we would be failing FR-007 and SC-006, so this is not a recommended skip. It is, however, the natural seam if implementation hits a late blocker (e.g., CI infrastructure pushback).

**Backout plan**: every task is independently revertible. `git rm` of `knip.json` + reverting the `package.json`/`Taskfile.yml`/`.github/workflows/ci.yml` edits restores baseline behaviour. `updater.ts` is recoverable from git history (the commit in T009). The whole feature is a config change with one file deletion — there is no persistent data or schema migration to unwind.

**Coordination handoff**: When this feature merges, whoever picks up backlog item #199 next must read research.md R-007 before editing `knip.json`. The coordination message is pasted into T027's PR description so it is visible in the merge history.


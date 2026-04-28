<!--
Cached opener for the feature post. Written during `/speckit.plan`, read
by `/speckit.pr` to assemble the top of `media/shipped-post.md`.

- No YAML front matter. Prose only.
- Four sections with `##` headings, in the order below.
- The `## Hook` heading is stripped at ship time — its content sits at the
  very top of the post above "What We're Building", with no heading.
- The other three sections are copied verbatim into the final post.
- Voice: first-person, conversational — see `.claude/agents/media/content.md`.
- Do NOT include calls to action, feedback solicitations, or LinkedIn copy.
-->

## Hook

| Before (suite muted under #142) | After (suite re-activated) |
|---|---|
| 5 log-panel E2E tests `test.describe.fixme(...)`-suspended | 5 log-panel E2E tests running on every merge |
| `scripts/check-log-panel-skip-guard.sh` deleted (had to be, to allow the mute) | Skip-guard restored verbatim from SHA `5385f6e8`, wired into `task lint` |
| BACKLOG row 233 open, blocking on #142 | BACKLOG row 233 struck-through, #142 struck-through, no rows blocked on the webview lifecycle bug |
| Code-server → extension host → LogPanel iframe path covered only locally | Three consecutive green CI runs of the VS Code E2E job before merge |
| `// #233 — Re-suspended pending #142 ...` comment loitering in test file and Taskfile | Comments removed; the historical record lives in the spec, not the code |

## What We're Building

The five log-panel end-to-end tests are coming back. They were suspended in February when an openvscode-server image-lifecycle bug — tracked as #142 — made `resolveWebviewView` fire unreliably in headless CI, and the only honest move was to mute them rather than ship a flaky signal. Patch 3 of #142 (visibility-gate removal) shipped via PR #548; the lifecycle is sound again, and the recipe in this spec is how the suite gets un-muted without losing any of the discipline that came with muting it in the first place.

The result is one focused PR that flips five `test.describe.fixme` calls back to `test.describe`, restores the skip-guard lint script that prevents anyone from re-muting the suite without a corresponding spec, re-wires the guard into `task lint`, and strikes through the BACKLOG row that has been holding the place for this work. The integration path it guards — code-server boots, the extension host loads, the LogPanel iframe receives postMessage traffic from the VS Code message bus — is the one most likely to silently regress when openvscode-server moves underneath us, which is why getting it back into per-merge CI matters more than the size of the diff would suggest.

## How It Fits

This sits in the test-infrastructure layer, immediately downstream of #142 (the upstream blocker that made the mute necessary) and immediately upstream of every future PR that touches the LogPanel, the extension host, or the openvscode-server pinned version. It is not a new capability — it is the closing parenthesis on a temporary debt that opened in #534 and was tracked openly in BACKLOG.md and in the Constitution's Article XIII rules for muted suites. Once this lands, the project has zero tests muted on the upstream-bug clause, and the precedent — one spec per suspension, one spec to un-suspend, evidence on both ends — is established for the next time a third-party tool forces the same hard choice.

## Key Decisions

- **One atomic commit, not a staged rollout.** Un-mute the five tests, restore the skip-guard script, re-wire it into `Taskfile.yml`, strike-through BACKLOG row 233, and remove the explanatory comments — all in the same commit. Constitution Article XIII.1 wants the un-suspension to be reviewable as a single unit, so reviewers can see the full delta in one diff rather than chasing it across three.

- **Three consecutive green CI runs before merge, not Playwright `--repeat-each`.** The flake class #142 fixed lived at the openvscode-server image-lifecycle level, not inside the test logic, so the only signal that catches a regression of that class is a fresh CI run on a fresh container. We use the GitHub "Re-run jobs" button three times rather than burning local CPU cycles on `--repeat-each`, which would re-use the same browser context and miss the exact failure mode we care about.

- **Skip-guard restored verbatim, no improvements.** `scripts/check-log-panel-skip-guard.sh` comes back from SHA `5385f6e8` exactly as it was — 41 lines of bash and grep, no rewrite, no expansion to other suites. The temptation to generalise it ("a skip-guard for every test file!") was considered and rejected: the guard exists because this specific suite has a specific history, and broadening its scope would dilute the signal it sends to reviewers.

- **Comments removed from code, history kept in the spec.** The `// #233 — Re-suspended pending #142 ...` block at lines 11–18 of the test file, and the matching mute-explanation block at lines 115–120 of `Taskfile.yml`, are both deleted in this commit. The trade-off here is between code that documents its own scars and code that reads cleanly; we picked the latter on the basis that the spec, the BACKLOG strike-through, and the git history together do a better job of preserving the why than a comment that will eventually go stale.

- **No application code touched.** Tests, lint script, Taskfile, BACKLOG, and the spec artefacts — that's the entire surface area. Anything that drifts beyond those five files in review is a signal that the un-suspension is being smuggled through alongside unrelated work, and should be split out.

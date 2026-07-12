---
layout: future-post
title: "Building the Repo-Review Skill"
date: 2026-07-12
track: [momentum, credibility]
author: Ian
reading_time: 7
tags: [tracer-bullet, code-review, tooling]
excerpt: "A repeatable whole-repo review where every finding must survive an adversarial verification pass before it's reported."
---

```mermaid
flowchart LR
  Recon[Recon agent<br/>builds work-list] --> Reviewers[Reviewer agents<br/>subsystem × dimension, in parallel]
  Reviewers -- candidate findings --> Verifiers[Adversarial verifiers<br/>try to refute each claim]
  Evidence[Evidence tools<br/>knip · lint · coverage · mutation checks] --> Verifiers
  Verifiers -- refuted --> Counted[Counted, not reported]
  Verifiers -- survived --> Synthesis[Synthesis agent<br/>clusters themes]
  Synthesis --> Report[Dated report]
  Synthesis --> Ledger[Findings ledger<br/>RR-NNN · open / fixed / accepted-risk]
```

## What We're Building

Future Debrief now has around 200 delivered features behind it — roughly 230 Python files and 1,300 TypeScript files, built one spec at a time through the speckit workflow. Each feature gets reviewed on its way in, and that per-feature discipline has held up well. What nothing does is step back and ask whether the whole still hangs together: does the constitution still match what's actually in the codebase? Have the tech-debt gains from the March review quietly eroded? Are there tests that pass without testing anything?

This feature is a reusable `/repo-review` skill that audits the entire repository across those four dimensions — constitution conformance, correctness bugs, tech-debt regression against the #172 baseline, and test quality. The distinguishing rule is that every candidate finding must survive an adversarial verification pass, where a second agent actively tries to refute it, before it can appear in the report. Refuted candidates get counted, not listed. The bet is simple: a report I can act on without re-checking every claim is worth more than a longer report I can't trust. Output is a dated report plus a machine-readable findings ledger with stable IDs (RR-NNN) and statuses, so the next run reports what changed rather than rediscovering the same issues. A companion `/repo-review.fix RR-NNN` skill takes any ledger finding straight into the fix → test → PR flow. There's an obvious recursion here that I find genuinely interesting: this is a fleet of agents auditing a codebase that was itself largely built by agents — and the adversarial layer exists precisely because unverified AI findings are noise.

## How It Fits

The implementation is skill assets, not runtime code — two command files, four dimension playbooks with a severity rubric and tier map under `.claude/review/`, and one small typed Python helper for the ledger. Zero new dependencies, and nothing in the shipped product changes. What it plugs into is the project's institutional memory: the constitution supplies the conformance rules being checked, the #172 tech-debt review supplies the regression baseline, and confirmed findings flow back out into `bugs.md` and failure-pattern docs so the knowledge outlives any single run. The review's write boundary is deliberately hard — it reports, it never fixes — with all remediation flowing through the separate fix skill. The honest success metric isn't findings count; it's the resolution rate by the next run.

## Key Decisions

- **Verified-only signal bar.** Every finding survives an adversarial refutation pass before it enters the report. This trades recall for precision on purpose — a shorter report the maintainer trusts beats a longer one that needs re-checking.
- **Streaming pipeline with one barrier.** Recon builds a work-list of subsystem × dimension cells; reviewer agents stream candidates to verifiers with no synchronisation point between them. The single legitimate barrier is theme clustering at synthesis, because clustering needs the full picture.
- **Evidence tools ground the claims.** Verifiers lean on knip dead-code analysis, dependency audits, stricter-than-CI lint configs (report-only), coverage data, and mutation spot-checks that deliberately break code in a disposable git worktree to prove a suspicious test would actually fail.
- **The ledger is hand-editable YAML, validated by a typed helper.** Only the helper and the maintainer write it. A corrupt ledger halts the run rather than being silently regenerated — losing finding history would defeat the whole delta-reporting design.
- **Reconciliation matches by defect identity, not line numbers.** Findings carry a dimension + module + defect slug; line numbers churn far too fast across ~1,500 files to serve as identity.
- **Prevention over cure.** Synthesis must propose one permanent guard per finding theme — a lint rule, CI gate, CLAUDE.md instruction, or constitution amendment. This is the ADR-033 pattern: one incident becomes a standing rule.
- **A tier map focuses the effort.** The deepest review goes to `shared/schemas` plus the generators and the Python services — the data-integrity spine — with lighter passes elsewhere.

## By the Numbers

| | |
|---|---|
| Helper tests passing | 36 |
| Coverage (`scripts/review-ledger.py`) | 75% |
| New runtime dependencies | 0 |
| Review dimensions | 4 |
| Review tiers | 3 |
| Heuristics across the playbooks | 20 |
| Implementation tasks | 54 |

The 75% is measured on the ledger helper. The uncovered quarter is the argparse CLI wrapper — parser wiring, `main`, the `_cmd_*` shims — which is exercised separately through real CLI transcripts (`cli-demo.txt`, `validation-output.txt`) rather than mocked in the unit suite. The core logic (load, validate, save, reconcile, `record_fix_pr`, tuning recommendations) is unit-tested directly. The 20 heuristics split across the four playbooks — constitution conformance, correctness bugs, tech-debt regression, and test quality — each with its own id prefix so a structural test can prove no playbook borrows another's heuristics.

## Lessons Learned

The reconciliation logic is where the real work turned out to hide, and it broke in ways I didn't anticipate.

The first thing that had to go was line numbers as identity. My initial instinct was to match a re-detected finding to its ledger entry by location. That falls apart immediately: across ~1,500 files, line numbers churn constantly — a defect on line 142 in one run is on line 158 the next without anyone touching it. So identity became `(dimension, module_path, defect_slug)`, and the line number is treated as a refreshable attribute, not part of the key. A finding whose line moved still matches its entry; only the defect itself disappearing marks it fixed.

Then two genuine bugs surfaced in the reconcile pass. The first was a falsy-value collapse: the finalise path passes an empty pairings dict `{}`, and the dry-run path passes `None`, and both are falsy — so an `if not pairings` check silently treated a real finalise as a dry run. The fix was to check `is None` explicitly and stop conflating "no pairings supplied" with "empty pairings supplied". The second was subtler: newly-assigned findings were getting swept into the "disappeared → fixed" loop, because the code iterated the ledger *after* adding the new entries. Snapshotting the original entries before assignment fixed it. Both are the kind of thing that passes a casual read and only shows up when you write the test that pins the exact transition.

The honest limitation worth stating: you can't unit-test a prompt. The playbooks, the severity rubric, the verification workflow — those are instructions to agents, and no pytest assertion proves they produce good judgement. So the validation is split. The Python helper carries real coverage because it's real code. The skill's reasoning is validated behaviourally by the inaugural run against the live repo — that run *is* the acceptance test, and it's instrumented rather than executed in CI because it costs multiple millions of tokens by design.

One deliberate choice I want to call out: the review does not exempt its own files from scrutiny. The skill assets, the ledger helper, this feature's code — all of it is in scope for the next `/repo-review`. A review tool that can't be reviewed by itself is exactly the kind of blind spot it exists to catch.

## What's Next

The inaugural multi-agent run against the live repository is the acceptance test — it's what proves the playbooks find real defects and the verification layer keeps noise out. Its confirmed findings flow into the ledger, each with a stable RR-NNN id and a hand-set disposition. From there, `/repo-review.fix RR-NNN` turns any single finding into a fix → test → PR without re-investigating it, and synthesis proposes one permanent guard per theme — a lint rule, a CI gate, a CLAUDE.md instruction — so that the findings don't just get fixed once but get prevented from coming back.

→ [See the code](https://github.com/debrief/debrief-future/pull/669)

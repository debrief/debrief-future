---
layout: future-post
title: "Shipped: the LogPanel stops lying about export rows"
date: 2026-04-22
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, schemas, log-panel, tech-debt, latent-bugs]
excerpt: "A tech-debt refactor that was meant to unblock three future features also fixed a quiet bug we'd been shipping for weeks: every export row rendered as if it were a manual checkpoint."
---

## What Shipped

Backlog item #208 landed: a schema-rooted `kind` discriminator on log entries. The planning post framed this as a refactor — separate *what a record is* (semantic) from *how it should look* (visual) so the next three LogPanel features have a clean contract slot. That's still the primary win. What the planning post understated, because we didn't know how quiet it had been, was the second win: the conflation was actively mis-rendering every export action as if it were a manual checkpoint, and moving off it fixed that as a side effect.

Concretely:

- **Before.** `const isSnapshot = resolveToolCategory(entry.toolName).category === 'snapshot'`. The gate asked "is this tool in the snapshot visual category?" and answered semantic questions with the visual answer. `export-png`, `export-csv`, `export-geojson` all happen to be in that visual category (because they share the same blue-camera icon grouping), so every export row rendered with a greyed-out "Manual checkpoint" placeholder and a hidden duration.
- **After.** `const isSnapshot = entry.kind === 'snapshot'`, where `kind` is projected from a new optional `activity_type` field on the LinkML `LogEntry` schema — a proper PROV-side signal. Export rows render with their parameter chips and duration, the way the rest of the tool rows do. Records explicitly flagged `activity_type: 'snapshot'` render the placeholder; nothing else does.

Zero data migration. `activity_type` is optional and backward-compatible; pre-208 records resolve to `kind: 'tool'` via the projection fallback.

## The Two Parallel Sessions

Two Claude sessions ran `/speckit.plan` on the same backlog item at roughly the same time and reached different architectures. One proposed a **UI-projection-only** approach: add `kind` as a TypeScript-only field, derive it in the host via `classifyKind(toolName) = resolveToolCategory(toolName).category === 'snapshot' ? 'snapshot' : 'tool'`. Its own visual-parity evidence proved the post-change predicate was identically equal to the pre-change predicate — a rename of the coupling, not a removal. Neither the export-tool bug nor the "depends on PROV-side signal" dependency in the backlog text got addressed.

The other proposed a **schema-rooted** approach: add the field to LinkML, regenerate Pydantic / TypeScript / JSON Schema, project onto the UI, let consumers read `entry.kind === 'snapshot'` and delete the fallback. The schema becomes the contract; `toolName` never enters the decision.

The schema-rooted plan aligned with Article II (LinkML as the single source of truth) and the #206 Type Audit's bucket-4 finding (hand-typed cross-domain discriminators are candidates for schema promotion). It also fixed the export-row bug as intentional correctness rather than preserving it as "visual parity". We went with that one and reused the UI-side contract surface (the `TimelineEntryKind` union, the `assertNeverKind` exhaustiveness sink, the barrel exports) from the UI-only branch so the 37-task plan shrank to around 25 tasks in practice.

## How It's Built

Four atomic commits, each CI-green on its own:

1. **Schema + regeneration.** `ActivityType` enum + optional `activity_type` slot on `LogEntry` in `shared/schemas/src/linkml/log-entry.yaml`. `make generate` regenerates Pydantic, TypeScript, JSON Schema. A post-processor in `scripts/generate.py` narrows the TS emit from `activity_type?: string` to `activity_type?: ActivityType` — same pattern as the existing `TemporalSlice` and `RawGeoJSONFeature` fix-ups, because `gen-typescript` flattens enum ranges to `string` at interface fields. Three golden fixtures (snapshot-present, field-absent, invalid-value) land alongside, plus a five-test adherence suite exercising Python round-trip and enum rejection.
2. **Populator.** `apps/vscode/src/views/logPanelView.ts` gains `kindFromActivityType(activity_type)` — a total, non-throwing, closed-union projection. No `toolName` reference, no tool-ID literal, no `resolveToolCategory` call in the kind-resolution path. `toTimelineEntry` becomes exported for testing. Thirteen new unit tests cover the mapping, the fallback, and SC-002 totality over a representative catalogue.
3. **Consumer switch + drift guards + rebaseline.** `LogEntry.tsx:114` flips to `entry.kind === 'snapshot'`. `resolveToolCategory` drops out of this file's imports (it stays in `ToolCategoryIcon` where visual classification belongs). Five new render tests exercise the kind-driven cases; one pre-existing edge-case test that was leaning on the bug gets patched to set `kind: 'snapshot'` explicitly. Two pre-existing Storybook snapshot-demo fixtures (`cat-snapshot`, `edge-snapshot`) that used `export-png` as their vehicle now carry `kind: 'snapshot'` — their rendered appearance is identical, the driving signal is correct. And two CI-run drift tests lock it in: one parses `LogEntry.tsx` source and asserts no `category === 'snapshot'` gate survives; the other parses `kindFromActivityType`'s function body and asserts no tool-ID literal is in there.
4. **Polish.** ADR-023 in `docs/project_notes/decisions.md` (supersedes feature 176 Decision 2A). Evidence pack under `specs/208-timeline-entry-kind/evidence/` — round-trip proof, grep transcripts, test summary, usage examples, visual-regression narrative.

## Surprises

**Two bugs for the price of one.** The pre-migration probe caught something the planning post didn't: `toolName: 'manual-checkpoint'` (the literal tool name) *wasn't* in `TOOL_ID_TO_CATEGORY`, so it resolved to the neutral fallback and rendered as a normal tool row. The "manual checkpoint" placeholder was firing for the wrong entries *and* not firing for the right ones. Both directions were inverted. The schema-rooted fix corrects both as a single consequence of reading `activity_type` instead of the tool's visual category.

**The UI-only plan's "visual parity" evidence was itself the best argument for the schema-rooted plan.** Its author (Claude, a different session) proved `kind === 'snapshot'` was provably equal to `ToolCategory === 'snapshot'` — meaning to establish that nothing had changed. Reading it with fresh eyes, that same proof is exactly the reason the rename wasn't a fix. When your proof of safety is "the coupling is preserved", the coupling is preserved.

**The schema edit was trivial.** Five lines of YAML. The expensive part was everything downstream — the TS post-processor, the populator import, the consumer migration, the fixture rebaseline, the drift tests, the evidence pack. The schema change itself took about ninety seconds. That's the point of Article XIV's pre-release freedom: when you're pre-1.0, schema changes are cheap; the rule is "fix the data, not the schema".

## What's Next

The three features that were blocked by this now have a clean slot:

- **Manual snapshot button.** A toolbar affordance that writes a `LogEntry` with `activity_type: 'snapshot'` and no backing tool run. Currently a P2 on the roadmap.
- **Standalone tune markers.** The `'tune'` enum member is declared but not yet emitted. When a future feature wants to write a tune-only entry (no tool invocation, just a parameter-change marker), it sets `activity_type: 'tune'` and the UI gets a dedicated row.
- **Analyst-authored rationale entries.** Log entries that carry only free-text reasoning — a fourth kind would be added to the union at that point, and the closed-union exhaustiveness check at every consumer switch forces the renderer to handle it explicitly.

Adding a fourth kind is one union edit. Every consumer switch that doesn't handle it fails `tsc --noEmit` at the `default` branch. That's the compile-time contract the closed-union exhaustiveness buys — and it's why the union is closed rather than a free-form string.

## Evidence

- `specs/208-timeline-entry-kind/evidence/visual-regression-evidence.md` — pre/post DOM narrative, contrasts against the superseded UI-only plan's misleading visual-parity framing.
- `specs/208-timeline-entry-kind/evidence/semantic-gate-grep.txt` — SC-001 transcript showing zero residual `category === 'snapshot'` gates in rendering code.
- `specs/208-timeline-entry-kind/evidence/projection-purity-check.txt` — SC-005 transcript showing no tool-ID literal in the kind-resolution path.
- `specs/208-timeline-entry-kind/evidence/round-trip-evidence.md` — Python → JSON → Python proof for explicit, absent, and invalid-enum cases.
- `specs/208-timeline-entry-kind/evidence/test-summary.md` — 27 new tests, zero regressions beyond the pre-existing sandbox-only `stacService` chmod failure.
- ADR-023 in `docs/project_notes/decisions.md` — decision record, supersedes feature 176 Decision 2A.
- Planning post: [link].

---
layout: future-post
title: "Building LinkML-Derived STAC Writer Types"
date: 2026-05-09
track: [momentum]
author: Ian
reading_time: 5
tags: [tech-debt, schema, linkml, stac-writer, type-safety]
excerpt: "Four hand-written declarations of the same type. They disagreed. Now there is one."
---

| Where the type lives | What it says `source` is | What it says `tool` is |
|---|---|---|
| `shared/schemas/src/linkml/stac-extension.yaml` (the canonical schema) | `"user"` | `"debrief.propertiesPanel"` |
| `@debrief/stac-writer/src/interface.ts` (hand-written) | `"user" \| "tool" \| "import"` | `string` |
| `@debrief/components/src/PropertiesPanel/provenanceTypes.ts` (hand-written) | a literal `typeof` of a sentinel | a literal `typeof` of a sentinel |
| `@debrief/schemas/src/generated/typescript/types.ts` (LinkML-generated, in the repo, used by nobody) | `string` | `string` |

Four declarations of the same concept. They do not agree.

## What We're Building

The constitution says the LinkML schema is the single source of truth for every type that crosses a process boundary. The STAC writer was among the last places in the codebase still ignoring that — it carried a hand-rolled TypeScript declaration of `PropertiesProvenanceEntry` that had quietly drifted from the schema it was meant to mirror.

This change routes `PropertiesProvenanceEntry` through the generated artefacts and adds a CI check that fails the build if anyone regenerates and forgets to commit. `StacItem` remains hand-written for now; the reason for that is explained below under Lessons Learned, and tracked at backlog #256.

It is not a new capability. It is the removal of a class of latent bug — the kind where a writer accepts a value the schema would reject, or rejects a value the schema would accept, and nobody notices until a downstream reader chokes on the result.

## How It Fits

The writer sits between `saveSession` and the STAC catalog (filesystem in the VS Code extension, IndexedDB in the web-shell — both behind the same interface introduced in #236). Everything that round-trips through the catalog is governed by the LinkML schema in `shared/schemas/`; the writer was the last contract surface still hand-typed, flagged in #236's review and tracked back to here. With this change the writer believes what the schema says, the runtime validator enforces what the generated types cannot, and the CI drift check makes that agreement durable.

## Key Decisions

- **Use a hybrid intersection, not a full hand-over to `string`.** LinkML's `gen-typescript` widens pattern-constrained fields like `tool: "debrief.propertiesPanel"` to plain `string`. The original plan was to accept that widening and rely on the runtime validator as the enforcement gate. During review we looked more carefully: the runtime validator (`isValidPropertiesProvenanceEntry`) is only called in tests, never in either production write path. The literal types in the components-side declaration were the actual compile-time guard. Accepting loose strings would have silently regressed Article I.3. Instead, the components-side type is now a hybrid intersection:
  ```typescript
  export type PropertiesProvenanceEntry =
    Omit<Generated, 'tool' | 'method' | 'source'> &
    {
      tool: typeof PROPERTIES_PANEL_TOOL_SENTINEL;
      method: `properties-panel@${string}`;
      source: 'user';
    };
  ```
  Schema-driven for `activity_id`, `timestamp`, and `fields`; literal-narrowed for the three pattern-constrained fields. The narrowing survives future schema additions automatically — only a deliberate widening of `tool`, `method`, or `source` requires a hand-edit to the intersection.

- **Don't model `StacItem` in our LinkML — yet.** The original spec planned to type `StacItem.properties` as `StacExtensionProperties & Record<string, unknown>`. Review surfaced that LinkML's `gen-typescript` drops the `debrief:` JSON-key prefix from generated field names, so the writer's actual access pattern (`props['debrief:provenance_log']`) would still hit the index signature and gain zero typed slots. Shipping that half would have been a misleading "fix." It was dropped and captured at backlog #256.

- **Narrow the writer's `source` enum to `"user"`.** The hand-written `"user" | "tool" | "import"` was dead code — no caller ever produced the other two values. The writer now agrees with the schema.

- **Drift check goes in `schema-tests.yml`.** That workflow already runs the generator; one `git diff --exit-code` step is enough. The failure message names `task schema:generate` so a contributor sees the fix before they finish reading the log.

- **Mark generated files `linguist-generated=true`.** GitHub collapses them in PR diffs by default, which keeps review attention on the hand-written change rather than the regenerated noise.

## By the Numbers

| | |
|---|---|
| Tests passing | 2,661 |
| Tests failed | 0 |
| Python unit tests | 1,887 |
| TypeScript unit tests | 774 |
| Sample STAC items round-tripped | 73 |
| Hand-written type body declarations (before) | 4 |
| Hand-written type body declarations (after) | 1 (generated) |
| Tasks planned | 26 |
| Tasks executed | 25 |
| Evidence files captured | 7 |

## Lessons Learned

**The `/speckit.review` caught a critical false-promise.** The original plan would have typed `StacItem.properties` as `StacExtensionProperties & Record<string, unknown>`. Review surfaced that LinkML's `gen-typescript` drops the `debrief:` JSON-key prefix, so the writer's actual access patterns (`props['debrief:provenance_log']` etc.) would still hit the index signature and gain zero typed slots. We dropped that half of the spec rather than ship a misleading "fix." The work is tracked at #256; getting it right requires either a prefix-aware generator patch or a hand-written mapping layer — not obvious which yet.

**The runtime validator was theatre.** Spec text and the original review decision both described `isValidPropertiesProvenanceEntry()` as the enforcement gate. A second look found it is only called in tests, never in either production write path. The literal types on the components side were the actual write-time guard all along. Accepting loose strings from the generator — as the original plan proposed — would have silently removed that guard without any test failure. The hybrid intersection preserves it.

**Generator is byte-deterministic.** SC-007 was flagged as a potential P0: if `gen-typescript` or `gen-pydantic` had any run-to-run noise, the drift gate would produce false positives. Two consecutive regeneration runs against the same source produced identical output, no normalisation pass needed. One `git diff --exit-code` step does the whole job.

**Dead code surfaces under literal types.** Once `tool` narrowed to `typeof PROPERTIES_PANEL_TOOL_SENTINEL`, the runtime sentinel check at `apps/vscode/src/services/stacWriterFs.ts:244` became provably unreachable — ESLint flagged it immediately. Removed. It had been a workaround for the old `tool: string` typing; the type system now makes the workaround unnecessary and visible.

## What's Next

- **#256** — Prefix-aware TypeScript typing for `StacExtensionProperties` (medium, 3–5 dev-days). The deferred half of this spec. Needed before new `debrief:*` fields can flow into the writer's typed surface automatically — the current gap is that LinkML's generator strips the `debrief:` prefix from field names, so generated types don't match the JSON keys the writer actually reads.

- **#257** — Production read-path runtime validation of provenance entries (low, 1 dev-day). The write-side compile-time guard now exists; this closes the symmetric read-side gap, where entries are currently cast rather than validated.

→ [See the code](https://github.com/debrief/debrief-future/pull/240)

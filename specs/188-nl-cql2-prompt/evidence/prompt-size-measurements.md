---
feature: 188-nl-cql2-prompt
captured_at: 2026-04-14
artefact: prompt-size-measurements
measured_by: shared/components/src/nl-cql2/__tests__/promptSize.test.ts
---

# Prompt Size Measurements (T035 / research.md §11 / decision 16A)

Measured against the current enum bundle (`shared/data/enum-bundle.json`)
with the test phrase `"UK submarines"`. The 30/50-platform rows synthesise
an inflated enum bundle by duplicating `nationalities`, `tags`, and
`feature_tags` with distinct suffixes — conservative because real registry
growth adds vessel classes too, but vessel classes already dominate the
fixed portion of the prompt so the relative scaling is unchanged.

| Registry size                | Multiplier | Prompt size | Headroom vs SC-004 (20 480 B) |
|------------------------------|:----------:|:-----------:|:-----------------------------:|
| current (≈10 platforms)      | 1×         | 5 112 B     | 15 368 B (75.0%)              |
| ≈30 platforms                | 3×         | 6 322 B     | 14 158 B (69.1%)              |
| ≈50 platforms                | 5×         | 7 452 B     | 13 028 B (63.6%)              |

**Headroom assessment**: The prompt stays comfortably under the 20 KB
ceiling (SC-004) even at 5× the current registry. The dominant growth is
the enum bundle JSON-embedded section of the prompt; the role framing,
schema description, and worked examples are fixed.

**Enforcement**: `buildPrompt.test.ts` asserts
`Buffer.byteLength(prompt) < 20_480` at the current bundle size on every
CI run. `promptSize.test.ts` asserts the same at the 50-platform synthetic
bundle, so growth that would blow the ceiling fails CI immediately.

**Reproduction**:
```
pnpm --filter @debrief/components vitest run src/nl-cql2/__tests__/promptSize.test.ts --reporter=verbose
```

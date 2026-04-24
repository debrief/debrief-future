---
feature: 188-nl-cql2-prompt
captured_at: 2026-04-16T13:05:23Z
artifact: NL → CQL2 prompt-size scaling measurement
source: shared/components/src/nl-cql2/__tests__/prompt-size.test.ts
---

# Prompt-size scaling measurements

Produced by the `prompt-size.test.ts` measurement harness (gated by
`DEBRIEF_MEASURE_PROMPT=1`) against the phrase "UK submarines" and the
current `shared/data/enum-bundle.json`.

| Registry size (platforms) | Prompt size (bytes) | Headroom vs 20 KB |
|---------------------------|---------------------|-------------------|
| 10 (current shipped enum bundle) | 6,018 | 14,462 bytes |
| 30 (projected — tree cloned to ~30 leaves) | 15,318 | 5,162 bytes |
| 50 (projected — tree cloned to ~50 leaves) | 27,342 | **exceeds ceiling by 6,862 bytes** |

## Interpretation

- At the current 10-leaf taxonomy the prompt sits at roughly 30% of the
  20 KB ceiling (SC-004 / decision 15A).
- Doubling the taxonomy keeps the prompt under the limit.
- Tripling to 50 registered platforms breaks through the ceiling by ~7 KB.
- Breakpoint: roughly 38–40 taxonomy leaves.

## Method

The test helper `makeTreeOfSize(base, targetLeaves)` repeatedly clones the
shipped `vessel_class_tree`, suffixing each subtree's ids with `-vN`, until
the total leaf count meets the target. `buildPrompt(phrase, cloned)` is then
rendered and its byte length measured.

Because the enum bundle is dominated by the vessel-class taxonomy (other
enums — nationalities, tags, feature_tags, exercises — are stable), this
extrapolation is a reasonable proxy for registry growth.

## Reproducing locally

```sh
DEBRIEF_MEASURE_PROMPT=1 \
  pnpm --filter @debrief/components test -- --run src/nl-cql2/__tests__/prompt-size.test.ts
```

## Trigger for action

Once the platform registry (#180) crosses ~30 platforms, consider:

1. Dropping `full_name` labels from the prompt (ids are enough for the LLM).
2. Collapsing rendering to `vessel_role` leaves; suppress `vessel_type` ids
   unless they introduce a new role.
3. Compacting the `tag` / `feature_tag` lists with `…and N others` sentinels
   for rarely-used values.

None of these are needed today — this document exists as the documented
ceiling warning.

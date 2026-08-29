# Contract: Plot Summary v2 — budget-aware tool result (US4)

The result contract for `debrief_summarizeCurrentPlot` (and the compact-
serialization rule for all four tools). This is the tool-result contract the
E13 offline panel inherits.

## Serialization (all tools)

- All JSON text-part results are compact (no indentation/pretty-printing).
- `approxTokens` is computed over the emitted payload.
- Gate: fixture test asserts ≥15% payload reduction vs #284 pretty-printed
  baseline at each probe size (8 / 32 / 100 / 250 features).

## Summary rendering modes

| Host capability | Result part | Behaviour |
|---|---|---|
| `tokenizationOptions` supplied | prompt-tsx part | priority-pruned to the caller's budget |
| absent (older host / direct invokeTool) | compact-JSON text part | full content; `INVENTORY_CAP` backstop only |

Parity rule: at unconstrained budget both modes carry identical field content.

## Priority order (highest survives longest)

1. Plot identity (`plotId`, `title`, `timeSpan`), feature counts, `openPlots`,
   and the `shedding` notice itself
2. Per-feature `id`, `name`, `type`, `platform`, `pointCount`
3. Per-feature `timeSpan`
4. Per-feature `spatialDigest`

## Shedding notice

Whenever any content is shed (budget pruning or cap):

- `truncated: true`
- `shedding.omitted`: content classes dropped, in shed order
- `shedding.guidance`: instructs the model to narrow scope via selection,
  `debrief_searchPlots`, or `featureNames`/`featureIds`

Minimum-budget floor: plot identity + counts + guidance are always emitted;
never an empty or malformed result.

## Spatial digest

- Format: `"<sector>/<extent>"`, sector ∈ {N, NE, E, SE, S, SW, W, NW, C}
  (feature bbox centroid vs 3×3 grid over plot bbox), extent ∈ {pt, local,
  wide} (feature/plot bbox diagonal ratio).
- Omitted (field absent) for features without geometry — never fabricated.
- Deterministic for identical inputs.
- Acceptance: "the northern track" resolves to the correct feature id from the
  summary alone in the scenario replay (SC-006).

## Evidence regeneration

`evidence/token-budget-v2.md` re-tabulates the four probe sizes (now with
digests, compact form) against 4k / 8k / 32k local-model context windows,
superseding the #284 table for the E13 record (FR-018).

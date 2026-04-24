---
feature: 188-nl-cql2-prompt
captured_at: 2026-04-16T13:14:00Z
artifact: library usage example
---

# Usage example: `generateCql2("UK submarines", deps)`

This example shows how a downstream consumer (#189 Stakeholder Demo UI, #190
Live LLM Transport, or a Jupyter notebook) plugs the NL → CQL2 generator
into the filter engine.

## Library surface (public barrel)

```typescript
import {
  generateCql2,
  createPassthroughLLMClient,
  createRecordedLLMClient,
  type GenerationResult,
  type EnumBundle,
} from "@debrief/components/nl-cql2";
import { filterByCql2Json } from "@debrief/components/filter-engine";

// Load the enum bundle via the consumer's bundler (browser) or filesystem
// (Node). The generator never touches fs itself — it only accepts the
// structured EnumBundle.
import enums from "@debrief/shared-data/enum-bundle.json" assert { type: "json" };
```

## Wiring a transport

```typescript
// Option A — live transport (owned by #190). The generator is agnostic:
const liveClient = createPassthroughLLMClient(async (prompt) => {
  return await fetch("/api/llm", {
    method: "POST",
    body: prompt,
  }).then((r) => r.text());
});

// Option B — deterministic replay from a recorded-response bundle
// (this is how #188's harness and #189's offline demo mode run):
import responses from "./responses.json" assert { type: "json" };
const recordedClient = createRecordedLLMClient(responses);
```

## Translate a phrase

```typescript
const result: GenerationResult = await generateCql2("UK submarines", {
  enums,
  client: recordedClient,
});

console.log(result);
// {
//   phrase: "UK submarines",
//   cql2: {
//     op: "array_filter",
//     args: [
//       { property: "debrief:platforms" },
//       {
//         op: "and",
//         args: [
//           { op: "=", args: [{ property: "nationality" }, "GB"] },
//           { op: "=", args: [{ property: "domain" }, "subsurface"] }
//         ]
//       }
//     ]
//   },
//   lozenges: [
//     { filterType: "nationality", value: "GB" },
//     { filterType: "vessel-class", value: "submarine" }
//   ],
//   unrecognisedTerms: [],
//   error: null,
//   diagnostics: {
//     promptVersion: "2026-04-16.1",
//     promptHash: "1f64452b69b5…",
//     responseHash: "…",
//     usedLlm: true
//   }
// }
```

## Feed the CQL2 into the filter engine

```typescript
import { vesselClassTreeToTaxonomy } from "@debrief/components/filter-engine";

// Items are the consumer's StacBrowserItem[] (the stakeholder demo UI
// loads them from the catalog service; a Jupyter notebook could pass
// whatever it has).
const taxonomy = vesselClassTreeToTaxonomy(enums.vessel_class_tree);
const matching = filterByCql2Json(items, result.cql2, { taxonomy });

console.log(`${matching.length} items matched`); // e.g. "17 items matched"
```

## Render the lozenges in the filter bar

```typescript
// LozengeSeed fields are persistable; the consumer assembles a full
// LozengeItem by adding `kind: 'lozenge'` and a generated id via the
// existing FilterBar reducer.
for (const seed of result.lozenges) {
  dispatch({
    type: "ADD_LOZENGE",
    filterType: seed.filterType,
    value: seed.value,
  });
}
```

## Handle errors

The generator never throws on LLM-response failures; the `error` field
carries a structured reason. The harness treats any non-null `error` as a
test FAIL; a UI should surface the reason to the user.

```typescript
if (result.error) {
  console.warn(`NL → CQL2 failed: ${result.error.reason}: ${result.error.message}`);
  // The raw response is preserved on `result.error.rawResponse` for
  // diagnostics.
  return;
}
```

Possible `error.reason` values:

| Reason | Meaning |
|--------|---------|
| `malformed-json` | LLM response was not valid JSON. |
| `schema-violation` | JSON but missing required keys / wrong shape. |
| `hallucinated-field` | CQL2 references a property outside `PROPERTY_MAP`. |
| `unrecognised-term-leaked` | An `unrecognised_terms` value appeared as a predicate value in the CQL2 tree. |
| `cql2-evaluation-failed` | Shape-valid CQL2 but the reverse parser refused it (unsupported operator, bad arity). |

## Handle empty phrases

An empty or whitespace-only phrase short-circuits — no LLM call — and
returns an empty filter. The UI can treat this as "show everything".

```typescript
const allItems = await generateCql2("", { enums, client: liveClient });
// allItems.cql2 === {}
// allItems.diagnostics.usedLlm === false
```

## Handle out-of-vocabulary phrases

```typescript
const nonsense = await generateCql2("Klingon warbirds", { enums, client: recordedClient });
// nonsense.cql2 === {}
// nonsense.unrecognisedTerms === ["klingon", "warbirds"]
// nonsense.error === null
```

The UI can show an empty-state hint naming the unrecognised terms.

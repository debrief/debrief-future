---
feature: 188-nl-cql2-prompt
captured_at: 2026-04-15
artefact: usage-example
---

# Usage Example — `generateCql2` + `filterByCql2Json`

A library consumer takes an analyst phrase, runs it through the generator,
and filters a STAC catalog with the returned CQL2. The snippet below is
deliberately minimal — no transport, no UI, just the library API.

```typescript
import {
  generateCql2,
  createRecordedLLMClient,
  loadEnumBundle,
} from "@debrief/components/nl-cql2";
import { filterByCql2Json } from "@debrief/components/filter-engine";
import responses from "./fixtures/responses.json"; // recorded per phrase

const enums = loadEnumBundle();
const client = createRecordedLLMClient(responses);

// 1. Ask the generator for a CQL2 filter.
const result = await generateCql2("UK frigates", { enums, client });

console.log(result);
// {
//   phrase: "UK frigates",
//   cql2: {
//     op: "array_filter",
//     args: [
//       { property: "debrief:platforms" },
//       { op: "and", args: [
//         { op: "=", args: [{ property: "nationality" }, "GB"] },
//         { op: "=", args: [{ property: "vessel_role" }, "frigate"] },
//       ]},
//     ],
//   },
//   lozenges: [
//     { filterType: "nationality", value: "GB" },
//     { filterType: "vessel-class", value: "frigate" },
//   ],
//   unrecognisedTerms: [],
//   error: null,
//   diagnostics: { promptVersion: "2026-04-14.1", promptHash: "…", responseHash: "…", usedLlm: true },
// }

// 2. Apply it to your catalog.
const matched = filterByCql2Json(catalog, result.cql2);
console.log(matched.length); // → 21 on the current sample catalog
```

## Handling the result

The generator never throws on bad LLM output. Instead `result.error` is
populated — your consumer reads `error.reason` to decide how to present
the failure:

```typescript
if (result.error) {
  switch (result.error.reason) {
    case "malformed-json":          /* show "model returned garbage" */ break;
    case "schema-violation":        /* show "model response wrong shape" */ break;
    case "hallucinated-field":      /* show "model referenced an unknown property" */ break;
    case "cql2-evaluation-failed":  /* show "CQL2 operator unsupported" */ break;
    case "unrecognised-term-leaked":/* show "model leaked a vocab term" */ break;
  }
  return;
}

// Happy path: apply filter + show lozenges in the filter bar.
const items = filterByCql2Json(catalog, result.cql2);
dispatch({ type: "REPLACE_LOZENGES", payload: result.lozenges });
```

## Empty / whitespace phrase

The generator short-circuits empty phrases without calling the LLM:

```typescript
const empty = await generateCql2("   ", { enums, client });
// empty.diagnostics.usedLlm === false
// empty.cql2 === {}
// empty.lozenges === []
```

## Where to find each piece

- `generateCql2`, `buildPrompt`, `schemaDescription`, `createRecordedLLMClient`,
  `createPassthroughLLMClient`, `loadEnumBundle` — `shared/components/src/nl-cql2/index.ts`.
- `filterByCql2Json`, `PROPERTY_MAP`, `cql2JsonToFilterExpression`,
  `Cql2ParseError` — `shared/components/src/filter-engine/index.ts`.
- Harness (`runHarness`, `loadSampleCatalog`) — `shared/components/src/nl-cql2/__tests__/harness.ts`,
  test-only per decision 13A.

## Next steps (not in 188)

- **#189** plugs a real LLM transport into `createPassthroughLLMClient` and
  re-records `responses.json` via `scripts/record-nl-fixtures.ts`.
- **#190** wires the generator into a demo UI for end-to-end analyst use.

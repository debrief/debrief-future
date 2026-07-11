# Data Model: Copilot Chat Drives Debrief (Spike)

No LinkML schema change. These are TypeScript boundary types inside `apps/vscode/src/copilot/`, derived from existing `@debrief/schemas` / service types (Article IV.5 — derive, don't re-list; use `Pick`/`Omit` against the source types where a subset is taken). Every value entering from the LM boundary is validated to one of these before use (Article XV.5).

## LM tool inputs (validated at the boundary)

### SearchPlotsInput
| Field | Type | Notes |
|-------|------|-------|
| `text` | `string \| undefined` | free-text over title+description |
| `startTime` | `string \| undefined` | ISO-8601; interval overlap |
| `endTime` | `string \| undefined` | ISO-8601 |
| `platforms` | `string[] \| undefined` | platform name/type membership |
| `bbox` | `[number, number, number, number] \| undefined` | `[west, south, east, north]`; intersection |
| `open` | `boolean \| undefined` | if a single match, open it directly |

All optional, AND-combined. Empty input ⇒ list-all (bounded).

### SummarizeCurrentPlotInput / ListToolsInput
| Field | Type | Notes |
|-------|------|-------|
| `plotId` | `string \| undefined` | explicit override; else active plot |

### RunToolInput
| Field | Type | Notes |
|-------|------|-------|
| `toolId` | `string` | must match live registry (FR-017) |
| `params` | `Record<string, unknown>` | validated against the tool's schema |
| `plotId` | `string \| undefined` | target plot override |
| `scope` | `'all' \| 'selection'` | default `'selection'` when a selection exists, else `'all'` |
| `featureIds` | `string[] \| undefined` | explicit target feature ids; overrides `scope` (named-feature targeting, post-#672 live-testing) |
| `featureNames` | `string[] \| undefined` | target feature names, resolved against display names (exact then unique substring); overrides `scope`; unknown/ambiguous names are reported, not guessed |
| `utterance` | `string` | the analyst's originating request (→ provenance, FR-023) |

> **Named-feature targeting** (added after live testing surfaced the friction): an
> analyst can say "buffer the Contact track" without a manual map selection —
> `debrief_runTool` resolves `featureNames`/`featureIds` to the operating set,
> falling back to the selection/all scope when neither is given. Resolution reuses
> the same display-name logic as the summary, so the name the model saw is the name
> it can target. Mutating runs still gate on the plain-language confirmation (which
> now names the resolved features).

## Entities

### PlotMatch (search result item, → chat)
Derived from the `Plot`/item shape `stacService.listItems()` returns.
| Field | Type | Source |
|-------|------|--------|
| `plotId` | `string` | item id / path |
| `title` | `string` | item properties |
| `timeSpan` | `{ start: string; end: string } \| null` | datetime / start–end |
| `platforms` | `string[]` | item properties / collection summary |
| `bbox` | `[number,number,number,number] \| null` | item geometry |

### PlotSummary (→ chat; token-bounded)
| Field | Type | Notes |
|-------|------|-------|
| `plotId` / `title` | `string` | metadata |
| `timeSpan` | `{start,end} \| null` | |
| `features` | `FeatureInventoryEntry[]` | thinned; no geometry |
| `truncated` | `boolean` | true if inventory was capped (edge case) |
| `approxTokens` | `number` | FR-025 probe |
| `openPlots` | `{ plotId: string; title: string; active: boolean }[]` | override discovery (FR-009) |

### FeatureInventoryEntry
| Field | Type |
|-------|------|
| `id` | `string` |
| `name` | `string` |
| `type` | `string` (track / point / annotation / …) |
| `platform` | `string \| null` |
| `timeSpan` | `{start,end} \| null` |
| `pointCount` | `number \| null` |

### ToolRegistryView (→ chat, from `calcService`)
Subset of the cached `Tool[]`: `id`, `name`, `description`, `parameters` (schema), `category`, `mutating: boolean` (derived from `resultType` prefix `mutation/`), `applicability`.

### ChatEditOutcome (internal)
| Field | Type | Notes |
|-------|------|-------|
| `applied` | `boolean` | false if declined/failed |
| `resultType` | `string` | `mutation/*` vs additive vs dataset |
| `modifiedFeatureIds` | `string[]` | for the confirmation + telemetry |
| `dirty` | `true` | edit marks session dirty (never disk-written here) |

### TelemetryRecord (evidence JSONL — one per invocation)
| Field | Type |
|-------|------|
| `ts` | `string` (ISO; stamped by host, not in-script) |
| `tool` | `'searchPlots' \| 'summarizeCurrentPlot' \| 'listTools' \| 'runTool'` |
| `input` | `object` (the validated input) |
| `validation` | `'accepted' \| { rejected: string }` |
| `retries` | `number` |
| `confirmation` | `'approved' \| 'declined' \| 'not_required'` |
| `latencyMs` | `{ registry?: number; python?: number; apply?: number; total: number }` |
| `activeModel` | `string` (operator-annotated — R2) |
| `primingEnabled` | `boolean` |
| `outcome` | `'ok' \| { error: string }` |

Full JSON Schema in `contracts/telemetry-record.schema.json`.

## Validation rules

- Unknown `toolId` or params failing the registry schema ⇒ corrective text result, no Python spawn (FR-017).
- `scope: 'selection'` with empty selection ⇒ "nothing selected" result (FR-010).
- Missing/renamed `plotId` ⇒ list open plots, do not fail silently (edge case).
- Summary inventory capped at a fixed budget ⇒ `truncated: true` (edge case).
- Mutating `runTool` MUST have produced a `confirmationMessages` in `prepareInvocation`; a mutating result reaching `invoke` without prior confirmation is a programming error and MUST throw (defence-strict).

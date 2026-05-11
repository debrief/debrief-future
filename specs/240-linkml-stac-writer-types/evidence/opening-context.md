## Hook

| Where the type lives | What it says `source` is | What it says `tool` is |
|---|---|---|
| `shared/schemas/src/linkml/stac-extension.yaml` (the canonical schema) | `"user"` | `"debrief.propertiesPanel"` |
| `@debrief/stac-writer/src/interface.ts` (hand-written) | `"user" \| "tool" \| "import"` | `string` |
| `@debrief/components/src/PropertiesPanel/provenanceTypes.ts` (hand-written) | a literal `typeof` of a sentinel | a literal `typeof` of a sentinel |
| `@debrief/schemas/src/generated/typescript/types.ts` (LinkML-generated, in the repo, used by nobody) | `string` | `string` |

Four declarations of the same concept. They do not agree.

## What We're Building

The constitution says the LinkML schema is the single source of truth for every type that crosses a process boundary. The STAC writer was the last place in the codebase still ignoring that — it carried hand-rolled TypeScript declarations of `StacItem` and `PropertiesProvenanceEntry` that had quietly drifted from the schema they were meant to mirror. This change routes both contract types through the generated artefacts and adds a CI check that fails the build if anyone regenerates and forgets to commit.

It is not a new capability. It is the removal of a class of latent bug — the kind where a writer accepts a value the schema would reject, or rejects a value the schema would accept, and nobody notices until a downstream reader chokes on the result.

## How It Fits

The writer sits between `saveSession` and the STAC catalog (filesystem in the VS Code extension, IndexedDB in the web-shell — both behind the same interface introduced in #236). Everything that round-trips through the catalog is governed by the LinkML schema in `shared/schemas/`; the writer was the last contract surface still hand-typed, flagged in #236's review and tracked back to here. With this change the writer believes what the schema says, the runtime validator enforces what the generated types cannot, and the CI drift check makes that agreement durable.

## Key Decisions

- **Don't model `StacItem` in our LinkML.** Bare STAC 1.1 belongs to the upstream STAC working group; re-modelling it here would create drift with their schema, not eliminate it. Instead the writer types `properties` as `StacExtensionProperties & Record<string, unknown>` — we own the Debrief-extension portion, and that's the part we model.
- **Accept the loss of literal-string narrowness.** LinkML's TypeScript generator widens `tool: "debrief.propertiesPanel"` to plain `string`. The runtime validator `isValidPropertiesProvenanceEntry()` stays, and remains the enforcement gate. Same trade-off every other LinkML consumer in the repo already accepts.
- **Narrow the writer's `source` enum to `"user"`.** The hand-written `"user" | "tool" | "import"` was dead code — no caller ever produced the other two values, and the runtime validator would have rejected them anyway. The writer now agrees with the schema and the validator.
- **Drift check goes in `schema-tests.yml`.** That workflow already runs the generator; one `git diff --exit-code` step is enough. The failure message names `task schema:generate` so a contributor sees the fix before they finish reading the log.
- **Mark generated files `linguist-generated=true`.** GitHub collapses them in PR diffs by default, which keeps review attention on the hand-written change rather than the regenerated noise.

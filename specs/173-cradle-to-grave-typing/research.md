# Research: Cradle-to-Grave Typing

**Feature:** 173-cradle-to-grave-typing
**Date:** 2026-03-24

---

## R1. Can debrief_io and debrief_calc use Pydantic models from debrief_schemas without circular deps?

**Decision:** Yes — safe to use directly.

**Rationale:** The dependency graph is acyclic:
```
debrief_schemas (shared/schemas)
    ↑                ↑
    debrief_io       debrief_calc
    (no cross-deps between io and calc)
```

Both services already declare `debrief-schemas` as a dependency in `pyproject.toml` and already import from `debrief_schemas.validation` (e.g., `validate_feature`, `resolve_enum_values`). Using the generated Pydantic models (e.g., `TrackFeature`, `ReferenceLocation`) is no different — same package, same import path.

**Alternatives considered:**
- Protocol-based structural typing (rejected: unnecessary indirection when concrete models are available)
- Separate "types-only" package (rejected: `debrief_schemas` already serves this purpose)

---

## R2. How does the TypeScript generator decide which types to emit?

**Decision:** Add `session-state` and `tool-result` to `debrief.yaml` imports.

**Rationale:** The generator (`shared/schemas/scripts/generate.py:362`) runs `gen-typescript` against the master `debrief.yaml` schema. Types that aren't imported into `debrief.yaml` simply don't appear in the output. Currently excluded:
- `session-state.yaml` — not imported (service-owned types)
- `tool-result.yaml` — not imported (internal metadata)

Adding these to `debrief.yaml:17-26` imports will cause `gen-typescript` to include them automatically. The JSON Schema generator uses a separate curated `entity_types` list (line 304-328) but that only affects per-entity schema extraction, not TypeScript generation.

**Alternatives considered:**
- Separate TS generator for session-state (rejected: complicates build, fragments type package)
- Hand-write TS types for session-state (rejected: defeats the purpose of schema-first)

---

## R3. Do TypeScript type guards already exist for discriminated feature narrowing?

**Decision:** Yes — use existing guards from `@debrief/schemas`.

**Rationale:** `shared/schemas/src/generated/typescript/unions.ts` exports:
- `isTrackFeature(f)` — checks `f.properties.kind === 'TRACK'`
- `isReferenceLocation(f)` — checks `f.properties.kind === 'POINT'`
- `isMultiPointFeature(f)` — checks `f.properties.kind === 'MULTI_POINT'`
- `isMultiPolygonFeature(f)` — checks `f.properties.kind === 'MULTI_POLYGON'`
- `isAnnotationFeature(f)` — negation of all above

The `DebriefFeature` discriminated union covers all 12 feature kinds. `shared/components/src/utils/types.ts` re-exports these for convenience.

**Key insight:** The guards exist but are underused. 10 files import `propsRecord` from `featureProps.ts` (the escape hatch) instead of narrowing with guards. This is the adoption problem, not a tooling gap.

**Alternatives considered:** None needed — the infrastructure is in place.

---

## R4. What is FEATURE_MODEL_MAP and how does it work?

**Decision:** Use `FEATURE_MODEL_MAP` as the Python validation dispatch table.

**Rationale:** Defined at `shared/schemas/src/generated/python/debrief_schemas/validation.py:44-60`:
```python
FEATURE_MODEL_MAP: dict[str, type[ConfiguredBaseModel]] = {
    "TRACK": TrackFeature,
    "POINT": ReferenceLocation,
    "NARRATIVE": NarrativeEntry,
    "CIRCLE": CircleAnnotation,
    # ... all 12 kinds
}
```

The `validate_feature()` function (same file) looks up `feature["properties"]["kind"]` in this map and validates through the corresponding Pydantic model. Both `debrief_io` and `debrief_calc` already call `validate_feature()` — but in warn-and-continue mode.

**Action:** Promote to fail-fast at tool boundaries. Tools that receive features should validate on entry and return validated Pydantic models.

---

## R5. What is the `featureProps.ts` escape hatch and why does it exist?

**Decision:** Eliminate by replacing consumers with type-narrowing guards.

**Rationale:** `apps/vscode/src/utils/featureProps.ts:20-21` defines:
```typescript
export const propsRecord = (f: DebriefFeature): Record<string, unknown> =>
  f.properties as unknown as Record<string, unknown>;
```

It exists because `DebriefFeature` is a discriminated union — accessing `.platform_name` requires narrowing to `TrackFeature` first. Consumers find this inconvenient and use `propsRecord()` to cast to an untyped record instead. ADR-011 concentrated this into one audited site rather than scattering casts.

**10 consumer files:**
1. `calcService.ts` — feature serialisation for MCP
2. `setTrackColor.ts` — reads `style`, `platform_id`
3. `applySymbolStyle.ts` — mutates style overrides
4. `labelInterval.ts` — mutates `default_position_style`
5. `symbolInterval.ts` — same pattern
6. `moveShape.ts` — reads coordinates
7. `enlargeShape.ts` — reads coordinates
8. `mapPanel.ts` — feature rendering
9. `openPlot.ts` — plot loading
10. `executeTool.ts` — tool dispatch

Each consumer knows which feature kind it operates on. Adding a type guard at the top of each function eliminates the need for the escape hatch.

---

## R6. What is the migration strategy for Python tool functions?

**Decision:** Gradual migration — executor boundary first, then individual tools.

**Rationale:** Currently all 14 tool handlers return `list[dict[str, Any]]`. The executor already calls `validate_feature()` post-hoc (warn-and-continue). Migration path:

1. **Phase 3a:** Change executor to validate tool output via Pydantic and fail-fast. Tools still return dicts internally but the executor converts to models.
2. **Phase 3b:** Change individual tool functions to accept and return Pydantic models directly. Start with the simplest tools (e.g., `set_track_color` — single feature in, single feature out).
3. **Phase 3c:** Update `result_builder.py` to accept models and call `.model_dump()` for JSON responses.

This lets us tighten the type boundary incrementally without a big-bang rewrite.

**Alternatives considered:**
- Big-bang rewrite of all tools at once (rejected: too risky, high blast radius)
- Code-generation of tool stubs from schema (rejected: overengineered for 14 tools)

---

## R7. How should JSON.parse validation work in TypeScript?

**Decision:** Type-guard validation at parse sites, not Zod.

**Rationale:** The existing `SafeFeature` → `DebriefFeature` pipeline plus `isTrackFeature()` guards is sufficient. Adding Zod would introduce a new dependency and duplicate the validation logic already encoded in the type guards.

Pattern:
```typescript
const raw = JSON.parse(content) as SafeFeatureCollection;
const features: DebriefFeature[] = raw.features
  .filter((f): f is DebriefFeature => {
    const kind = (f.properties as Record<string, unknown>)?.kind;
    return typeof kind === 'string' && kind in FEATURE_KIND_SET;
  });
```

For non-feature data (MCP responses, config), add manual shape checks — these are small, stable schemas that don't warrant a runtime validation library.

**Alternatives considered:**
- Zod schemas for all parse sites (rejected: new dependency, duplication of LinkML-derived logic)
- `io-ts` or `valibot` (rejected: same concerns, plus unfamiliar to team)

# Failure Pattern: Type Erasure at Serialization Boundaries

**Date:** 2026-03-23
**Severity:** Systemic — affects data integrity guarantees (Constitution Article III: Provenance Always)
**Triggered by:** Import provenance silently dropped from Log Panel timeline

---

## The Pattern

When strongly-typed data crosses a serialization boundary (disk, IPC, message passing), its type information is erased. The receiving code reconstructs the data using casts (`as Record<string, unknown>`, `as unknown as T`) instead of validating it against the schema. This creates a gap where:

1. **The compiler cannot verify correctness** — casts are assertions, not checks
2. **Convention mismatches go undetected** — e.g., `activity_id` vs `activityId`
3. **Data is silently dropped** — accessing a non-existent key returns `undefined`, not an error

```
Writer (typed)  →  JSON (untyped)  →  Reader (cast, not validated)
     ✅                  ⚠️                       ❌
```

---

## The Incident

### What happened

Python importer (`debrief-io`) wrote provenance entries with **snake_case** keys:

```json
{
  "activity_id": "4ac3131d-...",
  "was_generated_by": { "tool": "rep-parser", "tool_version": "1.0.0" },
  "execution_duration": "PT0S"
}
```

TypeScript timeline assembly (`timeline.ts`) read them expecting **camelCase** keys:

```typescript
const activityId = entry.activityId;  // undefined — key is "activity_id"
if (typeof activityId !== 'string') continue;  // silently skipped
```

**Result:** Every import provenance entry was silently dropped. The Log Panel showed an empty timeline for imported plots. No error was raised anywhere.

### Why strong typing didn't prevent it

Three compounding failures:

**1. The Python writer bypasses the TypeScript type system entirely.**
`import_catalog.py` builds provenance as plain `dict` literals. Python dicts are untyped JSON — there is no compile-time check that the keys match the TypeScript `LogEntry` interface. The data crosses the language boundary as serialized JSON on disk.

**2. The TypeScript reader casts away the types at the boundary.**
```typescript
const entry = raw as Record<string, unknown>;  // erases all type safety
const activityId = entry.activityId;            // no error, just undefined
```
The `as Record<string, unknown>` cast tells TypeScript "trust me, this is a dictionary." Accessing `.activityId` on a snake_case object silently returns `undefined`.

**3. No shared schema governs both sides.**
The `LogEntry` TypeScript interface exists. The LinkML schema defines `log-entry.yaml` with snake_case field names. But:
- The Python importer hand-builds dicts without importing the generated Pydantic model
- The TypeScript reader casts to `Record<string, unknown>` instead of parsing through `LogEntry`
- No round-trip test validates Python-written → TypeScript-read provenance

---

## The Anti-Pattern Family

This is not one bug — it's a class of bugs. The same pattern appears in several forms:

### Form 1: Cast-instead-of-validate

```typescript
// ❌ Anti-pattern: cast erases type, compiler trusts you blindly
const props = feature.properties as Record<string, unknown>;
const kind = props.kind;  // could be undefined, wrong type, misspelled key

// ✅ Correct: validate at boundary, typed thereafter
const feature = parseFeature(raw);  // throws if invalid
const kind = feature.properties.kind;  // compiler guarantees this exists
```

### Form 2: Explicit property construction without spread

```typescript
// ❌ Anti-pattern: manually listing properties — easy to miss one
properties: {
  kind: 'TRACK',
  platform_id: props.platform_id,
  // ... provenance not listed, silently dropped
}

// ✅ Correct: spread then override, or use typed constructor
properties: { ...props, kind: 'TRACK' }
// or: TrackProperties.parse(props)
```

### Form 3: Cross-language naming convention mismatch

```python
# Python writes snake_case
{"activity_id": "...", "was_generated_by": {...}}
```

```typescript
// TypeScript reads camelCase
entry.activityId  // undefined
```

No validator sits between them to enforce or translate the convention.

### Form 4: JSON.parse without validation

```typescript
// ❌ Anti-pattern: parse returns `any`, cast provides false confidence
const item = JSON.parse(data) as StacItem;

// ✅ Correct: parse then validate
const item = StacItemSchema.parse(JSON.parse(data));
```

---

## Why This Violates the Constitution

- **Article I §3 (No silent failures):** The system silently dropped provenance entries instead of raising an error.
- **Article II §1 (Single source of truth):** The Python importer and TypeScript reader each had their own implicit schema for provenance — neither referenced the shared LinkML definition.
- **Article II §2 (Schema tests mandatory):** No round-trip test existed for the Python→JSON→TypeScript provenance path.
- **Article III §1 (Provenance always):** Import provenance was written correctly but never surfaced to the user.

---

## Root Cause: The Schema-First Pipeline Has Gaps

ADR-002 established schema-first development. ADR-008 identified that calc tools bypass it. This incident reveals the gap is wider:

| Layer | Schema-governed? | Notes |
|-------|-----------------|-------|
| LinkML master schema | ✅ Source of truth | Defines `LogEntry` in snake_case |
| Generated Pydantic models | ✅ Generated | But `import_catalog.py` builds dicts by hand instead of using them |
| Generated TypeScript types | ✅ Generated | But `timeline.ts` casts to `Record<string, unknown>` instead of using them |
| JSON on disk | ❌ Unvalidated | No schema check on read or write |
| Python → JSON serialization | ⚠️ Inconsistent | Some services use `by_alias=True`, others don't |
| JSON → TypeScript deserialization | ❌ Cast-only | `JSON.parse` + `as T` throughout |

The schema exists but is not **enforced** at the boundaries where data changes representation.

---

## Detection Checklist

To find more instances of this pattern, look for:

- [ ] `as Record<string, unknown>` — type erasure at boundary
- [ ] `as unknown as` — double-cast escape hatch
- [ ] `JSON.parse(...)` without subsequent validation — untyped deserialization
- [ ] `as any` — explicit type erasure
- [ ] `Record<string, unknown>` in function parameter types — untyped contracts
- [ ] `props['fieldName']` string-key access — bypasses typed property access
- [ ] Python `dict` literals where a Pydantic model exists — bypasses generated schema
- [ ] `model_dump()` without `by_alias=True` — snake_case leaks to JSON consumed by TypeScript
- [ ] Explicit property construction `{ a: x.a, b: x.b }` — fragile, drops unlisted fields

---

## Prevention: What Would Have Caught This

1. **Runtime validation at JSON boundaries** — a Zod/Pydantic parse step after `JSON.parse` or `json.load`
2. **Python importer using the generated Pydantic model** — `LogEntry(**fields).model_dump(by_alias=True)` would have output camelCase
3. **A golden fixture round-trip test** — Python-generated provenance entry fed through `assembleTimeline()` would have returned an empty timeline immediately
4. **Convention enforcement in CI** — a lint rule or test that verifies all JSON written by Python services uses `by_alias=True` when TypeScript consumers exist

---

## Guardrails Implemented (March 2026)

Six guardrails were implemented to prevent this class of bug from recurring:

### 1. JSON Wire Convention Formalised (ADR-010)

**All JSON on disk uses snake_case keys**, matching the STAC specification (the pre-existing naming standard in the project). LinkML defines fields in snake_case, Python `model_dump()` outputs snake_case natively, and generated TypeScript types use snake_case field names.

**Follow-up needed:** TypeScript consumer code in `session-state` and `LogPanel` currently uses hand-written camelCase interfaces. These must be migrated to use the generated snake_case types. Tracked as a separate task.

### 2. Hand-Built Dicts Banned at Boundaries

Python service code must use the generated Pydantic models to construct schema types — not `dict` literals. If a generated model exists for the data shape, you must use it. Enforced by `test_boundary_enforcement.py::TestModelDumpByAlias`.

### 3. ESLint Rules: Type Assertions at Boundaries

New rules across all TypeScript packages:
- `@typescript-eslint/consistent-type-assertions` with `objectLiteralTypeAssertions: never`
- `no-restricted-syntax` banning `as Record<string, unknown>` and `as unknown` casts

These fire at CI time and produce messages referencing ADR-011 and Constitution XV.7.

### 4. Loose-Type Assertions Require Human Approval (ADR-011, Constitution XV.7)

New constitutional clause: type assertions to loose types (`Record<string, unknown>`, `unknown`, `cast()`) are **expert overrides** requiring a `// SAFETY:` justification comment and explicit PR reviewer approval. If a generated type exists, you must use it. If none exists, create one.

### 5. Round-Trip Golden Fixture Tests

`shared/schemas/tests/test_provenance_roundtrip.py` tests that:
- `LogEntry.model_dump()` produces snake_case keys matching the STAC convention
- No camelCase keys appear in serialized output
- The Python→JSON→Python round-trip preserves all data

### 6. Python model_dump() Enforcement

`shared/schemas/tests/test_boundary_enforcement.py` scans service source files via AST analysis:
- Flags `model_dump(by_alias=True)` calls that would produce camelCase (violating ADR-010)
- Verifies `ConfiguredBaseModel` does NOT include an `alias_generator`

---

## Related

- **ADR-002:** Schema-First with LinkML — establishes the principle this pattern violates
- **ADR-008:** Schema-Validated Tool Inputs and Outputs — same class of issue in calc tools
- **ADR-010:** JSON Wire Format Uses camelCase — formalises the naming convention
- **ADR-011:** Type Assertions at Boundaries Require Human Approval — the approval gate
- **Constitution Article II:** Schema Integrity — the governing principle
- **Constitution Article XV §7:** Type assertions are expert overrides — the new clause

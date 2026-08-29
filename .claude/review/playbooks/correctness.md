# Playbook: Correctness Bugs (`CB-*`)

Hunts for real defects — code that produces a wrong result, loses data, or crashes on a real
input. A candidate under this dimension is only worth emitting if you can state a **concrete
failure scenario**: specific inputs/state → wrong output/crash. "Looks fragile" is not a
finding; "with input X this returns Y instead of Z" is. Cite the `CB-NN` id.

The adversarial verifier will try to refute your scenario against the code — if you can't name
the trigger, it will not survive.

## Data loss at boundaries (highest value — Article I/III territory)

- **CB-01** — *Silent drop on serialisation.* A value present in memory is absent after a
  round-trip through a DTO / persistence record / message payload. Trigger: the source type has
  a field the boundary type omits (see also CC-12). **Critical** on save paths.
- **CB-02** — *Lossy merge/overwrite.* A write blindly replaces existing data (annotations,
  user edits, sidecar fields) instead of merging. Trigger: two writers to the same record.
- **CB-03** — *Re-listed subset diverges.* A hand-maintained field list that has already
  fallen behind its source type. Trigger: source grew, copy didn't. (The ADR-033 / PR #623
  class.)
- **CB-04** — *Truncation/precision loss.* Epoch-ms vs seconds confusion, float→int narrowing,
  coordinate rounding on a persisted path. Trigger: a value near a boundary.

## Async / concurrency (host orchestration, write paths)

- **CB-05** — *Unawaited promise / missing await.* A promise-returning call whose result or
  rejection is dropped. Trigger: the awaited work fails or races a subsequent read. Cross-check
  with the strict-lint `no-floating-promises` leads.
- **CB-06** — *Race on shared state.* Two async paths mutate the same store/file without
  ordering. Trigger: interleaving — e.g. a save fires while a reconcile reads.
- **CB-07** — *Non-atomic write.* A multi-step write that can leave a half-written artefact on
  crash/interrupt. Trigger: process dies between steps. (See #268 save-atomicity.)

## Error handling

- **CB-08** — *Swallowed error.* `catch`/`except` that logs-and-continues where the caller then
  proceeds on invalid state. Trigger: the swallowed path returns a default that is wrong.
- **CB-09** — *Wrong error surface.* An error caught and re-thrown/reported as a different,
  misleading condition (the #273 "Forbidden" class). Trigger: user sees a misdiagnosis.
- **CB-10** — *Unvalidated external data.* Data crossing a boundary (file, network, message)
  used before validation. Trigger: malformed input reaches application logic. (Ties to CC-18.)

## Import pipelines (services/io, legacy data)

- **CB-11** — *Dialect/edge-case mishandling.* A parser branch that mishandles a real input
  variant. Trigger: a specific legacy dialect / malformed-but-real file.
- **CB-12** — *Off-by-one / boundary in ranges.* Time ranges, feature indices, playhead
  clamping. Trigger: first/last element, empty collection, single-item collection.

## Numeric / analysis (services/calc)

- **CB-13** — *Wrong formula or unit.* A calc returning a plausible-but-wrong number. Trigger:
  a golden case where the expected value is known. Prefer to confirm via the golden fixtures.
- **CB-14** — *Undefined on degenerate input.* Division by zero, empty-track bearing, NaN
  propagation. Trigger: degenerate but reachable input.

## Verification discipline

For every candidate, write the trigger explicitly and prefer to point the verifier at an
existing test/fixture that could exercise it. A candidate that only "reads wrong" without a
reproducible trigger belongs in working notes, not the report.

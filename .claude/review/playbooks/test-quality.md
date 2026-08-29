# Playbook: Test Quality & Coverage (`TQ-*`)

Assesses whether tests actually verify behaviour, whether the mandated schema tests exist, and
where critical paths are untested. Cite the `TQ-NN` id. This dimension pairs reading with two
tools: coverage numbers (pytest --cov, vitest --coverage) and **mutation spot-checks** — the
only way to prove a suspicious test verifies behaviour rather than asserting a mock.

## Tests that don't test (highest value)

- **TQ-01** — *Asserts the mock.* A test that configures a mock and then asserts the mock
  returned what it was told to — exercising no production logic. Confirm via mutation spot-check
  (R-006): break the code under test; if the test still passes, confirmed. **Medium** (the
  test provides false confidence).
- **TQ-02** — *Tautological assertion.* `expect(x).toBe(x)`, asserting a constant, or asserting
  a value the test itself computed the same way as the code.
- **TQ-03** — *Never-failing test.* No assertion, or an assertion unreachable behind a guard;
  a `try/except pass` that hides failures. Mutation spot-check confirms.
- **TQ-04** — *Snapshot-only for logic.* A behaviour that is only "tested" by a snapshot that
  would happily record the wrong output.

## Schema-test mandate (Constitution Article II / VI — overlaps CC-05)

- **TQ-05** — *Missing round-trip.* A schema/generated-type change with no Python → JSON →
  TypeScript → JSON → Python round-trip test (project schema-test strategy #2).
- **TQ-06** — *Missing golden fixtures.* A schema without canonical valid/invalid fixtures.
- **TQ-07** — *Missing structural comparison.* Pydantic-generated JSON Schema not asserted
  against the LinkML-generated one.

## Coverage gaps on critical paths

- **TQ-08** — *Untested Tier-1 module.* A data-integrity-spine module (per `tier-map.yaml`) with
  low or zero coverage. Evidence: coverage JSON; name the module and its number. **High** if a
  save/parse/transform path is uncovered.
- **TQ-09** — *Untested error path.* The happy path is covered but the error/edge branch that
  most matters (the one a CB-* finding lives in) has no test.
- **TQ-10** — *Integration gap.* Units are covered but the load→transform→store workflow has no
  end-to-end test (overlaps CC-14).

## Test robustness

- **TQ-11** — *Order-dependent / shared-state test.* A test that passes only in a given order or
  leaks state (the project already has one known case — see pyproject `xfail_strict` note).
  Trigger: run in isolation or reordered.
- **TQ-12** — *Flaky by timing.* A test depending on wall-clock, real timers, or network.

## Spot-check discipline

Only flag TQ-01/02/03 as confirmed after the mutation spot-check actually ran and the test
survived the break. If the spot-check could not run (tooling failure), report the candidate as
qualitative-only and say the spot-check was skipped — do not claim confirmation you don't have.

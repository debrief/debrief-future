# Playbook: Tech-Debt Refresh (`TD-*`)

Runs the #172 (March 2026) technical-debt review as a **regression check**: the categories
below were cleaned up in #172, and the job here is to detect where they have crept back, plus
dead code. Cite the `TD-NN` id. Ground every quantitative claim in tool output (knip,
dependency audit, strict lint) captured in the run's evidence directory — this dimension is
where the report earns the right to say numbers.

Reference: `specs/172-review-technical-debt/spec.md` defines the intended end state; a finding
here is "the #172 end state has regressed at X".

## Dependency skew (#172 US1)

- **TD-01** — *Version-range divergence.* The same dependency pinned to different ranges across
  `package.json` files (e.g. `@storybook/*`, `eslint`, `@typescript-eslint/*`). Evidence: the
  dependency-audit output. Trigger for severity: a runtime dep skew is higher than a devDep skew.
- **TD-02** — *Python constraint divergence.* `pydantic` / `ruff` / shared deps with different
  minimums across `pyproject.toml` files vs the root workspace. Evidence: audit output.

## Type duplication (#172 US2)

- **TD-03** — *Re-declared shared type.* A type that #172 consolidated (GeoJSONFeature →
  `SafeFeature`, one `TimeRange` in epoch-ms, `MCPToolDefinition`, `Bounds`) re-declared
  standalone instead of imported from its canonical home. **Medium**, or **High** if the copies
  have already diverged (that becomes a CB-03 correctness finding too).
- **TD-04** — *New uncanonical duplicate.* A newly-introduced type that duplicates an existing
  shared shape rather than importing it.

## Workspace / tooling alignment (#172 US3)

- **TD-05** — *Unregistered workspace member.* A Python service present on disk but missing
  from the uv workspace members or ruff `known-first-party`, so `uv sync` / `pytest` / lint
  skip it. Evidence: compare `pyproject.toml` members against `services/*` and `shared/*`.
- **TD-06** — *pnpm workspace gap.* A TS package on disk not covered by `pnpm-workspace.yaml`.

## Configuration drift (#172 US4)

- **TD-07** — *Divergent tool config.* tsconfig / eslint / ruff settings that should be shared
  but are copied and have drifted. Trigger: a rule enabled in one package and silently absent
  in a sibling that should match.
- **TD-08** — *Missing lint coverage.* A source directory not covered by any lint config, so it
  is silently unchecked.

## Logging hygiene (#172 US4)

- **TD-09** — *Stray console/print.* `console.log`/`print` left on a production path where the
  project uses a structured logger. Evidence: strict-lint leads.
- **TD-10** — *Swallowed-then-logged errors.* Overlaps CB-08; raise here when the pattern is
  systemic (many sites) rather than a single correctness bug.

## Dead code

- **TD-11** — *Unreferenced export/file.* knip reports it and the verifier confirms no dynamic
  import/registry lookup reaches it. **Low** unless it is a large surface. Evidence: knip output.
- **TD-12** — *Unused dependency.* A declared dependency knip reports as unused. Confirm it is
  not a peer/types-only/tooling dep before flagging.

## Discipline

Every TD finding must cite the tool output that grounds it. If a tool failed to run, do not
assert the number — say so and downgrade to qualitative (FR-010).

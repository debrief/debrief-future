# type-audit — scanner for [E11] Audit non-LinkML type declarations

Ad-hoc scanner that walks `apps/`, `shared/`, and `services/` with the
TypeScript compiler API and emits one JSON record per named `interface` /
`type` / `enum` declaration found in authored (non-generated, non-test)
source.

The scanner is **read-only analysis**. It emits an intermediate JSON file
that a reviewer consumes to author the committed Markdown report at
`docs/type-audit-2026.md`. It is not wired into CI; re-run it manually
when refreshing the audit.

See `specs/206-audit-non-linkml-types/quickstart.md` for the canonical
invocation.

## Invocation

From the repo root:

```bash
mkdir -p tmp
pnpm tsx scripts/audits/type-audit/scan.ts \
  --roots apps shared services \
  --exclude "shared/schemas/src/generated/**" \
  --exclude "**/__tests__/**" \
  --exclude "**/__fixtures__/**" \
  --exclude "**/*.test.ts" \
  --exclude "**/*.spec.ts" \
  --exclude "**/node_modules/**" \
  --out tmp/type-audit.json
```

Validate the JSON against the committed contract:

```bash
pnpm dlx ajv-cli validate \
  -s specs/206-audit-non-linkml-types/contracts/scan-output.schema.json \
  -d tmp/type-audit.json
```

## CLI flags

| Flag | Description | Default |
|------|-------------|---------|
| `--roots <dir...>` | Space-separated root directories to scan. | `apps shared services` |
| `--exclude <glob>` | May be repeated; micromatch-style glob applied to repo-relative paths. | see quickstart |
| `--out <file>` | Path for the emitted JSON. | `tmp/type-audit.json` |

The scanner prints a one-line summary on stderr (`Scanned N files, emitted
M records, K drift clusters`) so CI / pipe output stays clean.

## Output contract

See `specs/206-audit-non-linkml-types/contracts/scan-output.schema.json`
and `type-declaration-record.schema.json`. The scanner's unit tests
validate output against both contracts; a live ajv validation after each
run is the belt-and-braces check.

## Determinism

Records are sorted by `id` (`${packageName}:${relativeFilePath}:${declarationName}`)
before emission. `shapeHash` is a SHA-1 of the normalised printed AST. Two
runs on the same commit produce byte-identical JSON.

## Tests

```bash
pnpm exec vitest run --config scripts/audits/type-audit/vitest.config.ts
```

Fixture-driven unit tests cover enumeration, exclusions, auto-tagging,
drift clustering, contract-conformance, and determinism.

# Contracts — 206-audit-non-linkml-types

This feature does not introduce runtime APIs. The "contracts" captured here
document the shape of the **audit scanner's intermediate JSON output** so
that:

1. The scanner implementation (`scripts/audits/type-audit/scan.ts`) can be
   validated against a schema during unit tests.
2. A future re-runner of the audit can regenerate the report mechanically
   from a fresh scan without reverse-engineering the format.

## Files

- `type-declaration-record.schema.json` — per-record schema (one record per
  named TS declaration).
- `scan-output.schema.json` — top-level wrapper (arrays of records + drift
  clusters + metadata).

## Usage

```bash
# Run scanner, write to a temp JSON file
pnpm tsx scripts/audits/type-audit/scan.ts > /tmp/type-audit.json

# Validate against the schema (e.g. with ajv-cli in CI or a test)
npx ajv validate \
  -s specs/206-audit-non-linkml-types/contracts/scan-output.schema.json \
  -d /tmp/type-audit.json
```

Neither schema is consumed at runtime by production services — they exist
solely to formalise the scanner's output contract.

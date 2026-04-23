# Usage example — type-audit scanner + report generator

Audience: a future maintainer re-running the audit. This walks through the
three-step flow (scan → validate → report) and shows how to interpret one
record end-to-end.

## 1. Run the scanner

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
  --exclude "**/dist/**" \
  --out tmp/type-audit.json
```

Observed output on stderr at SHA `01166d6e`:

```
Scanned 317 files, emitted 885 records, 25 drift clusters [schema-rooted-candidate=260 boundary-candidate=5 drift-shortlist=106 none=514]
Wrote tmp\type-audit.json
```

Runtime: ~4 seconds on a clean local checkout.

## 2. Validate against the schema contract

```bash
node --input-type=module -e "
import Ajv2020 from 'ajv/dist/2020.js';
import fs from 'node:fs';
const ss = JSON.parse(fs.readFileSync('specs/206-audit-non-linkml-types/contracts/scan-output.schema.json', 'utf8'));
const rs = JSON.parse(fs.readFileSync('specs/206-audit-non-linkml-types/contracts/type-declaration-record.schema.json', 'utf8'));
const d = JSON.parse(fs.readFileSync('tmp/type-audit.json', 'utf8'));
const ajv = new Ajv2020({ strict: false, allErrors: true });
ajv.addSchema(rs, 'type-declaration-record.schema.json');
const v = ajv.compile(ss);
const ok = v(d);
console.log(ok ? 'VALID: ' + d.records.length + ' records' : JSON.stringify(v.errors, null, 2));
"
```

Observed output:

```
VALID: 885 records
```

## 3. Regenerate the report

```bash
pnpm tsx scripts/audits/type-audit/generate-report.ts \
  --in tmp/type-audit.json \
  --out docs/type-audit-2026.md
```

Observed output on stderr:

```
Wrote docs/type-audit-2026.md: 885 findings (schema-rooted=260, boundary-loose=5, single-domain=486, cross-domain-hand-typed=28, drift-candidate=106)
```

## Applying a classification — worked example

Pick a record from the scanner output and trace it through the classifier.

### Scanner JSON (excerpt)

```json
{
  "id": "@debrief/utils:shared/utils/src/mcp-types.ts:MCPContentItem",
  "packageName": "@debrief/utils",
  "filePath": "shared/utils/src/mcp-types.ts",
  "lineNumber": 30,
  "declarationName": "MCPContentItem",
  "kind": "interface",
  "isExported": true,
  "shapeHash": "<40-char SHA-1>",
  "rhsSummary": null,
  "imports": ["node:buffer", "node:crypto"],
  "autoTag": "none"
}
```

### Classifier trace

1. **R1 — drift-candidate?** The declarationName `MCPContentItem` appears in
   exactly one file. No drift cluster. Rule does not fire.
2. **R2 — boundary-loose?** Kind is `interface`, not `type`. Rule does not fire.
3. **R3 — cross-domain-hand-typed?** The name matches
   `CROSS_DOMAIN_NAME_PATTERNS[0]` (`/^MCP[A-Z]/`, theme `mcp-transport`).
   The file does not import `@debrief/schemas`. Rule fires with
   `theme=mcp-transport`.
4. **R4 skipped** (R3 already matched).
5. **R5 skipped** (R3 already matched).

### Finding emitted

| Field | Value |
|-------|-------|
| classification | `cross-domain-hand-typed` |
| summary | `interface MCPContentItem` |
| recommendedAction | `Open #222 — [E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML.` |
| backlogItemRef | `#222` |

### Report row

From `docs/type-audit-2026.md` §3.1:

```
| 15 | @debrief/utils | `shared/utils/src/mcp-types.ts:30` | `MCPContentItem` | interface `MCPContentItem` | Open #222 — ... |
```

## Extending the classifier

To extend the audit (for example: adding a new cross-domain name pattern
based on a type discovered after the initial scan), edit
`scripts/audits/type-audit/generate-report.ts`:

- **`CROSS_DOMAIN_NAME_PATTERNS`** — add a `{ re: /.../, theme: '...' }` entry.
- **`BACKLOG_TABLE`** — add or reuse a backlog entry keyed by theme.

Then:

1. Re-run `pnpm tsx scripts/audits/type-audit/generate-report.ts ...` to
   regenerate the report.
2. Commit the updated report and generator together.
3. Update the Changelog section in the report (§5).

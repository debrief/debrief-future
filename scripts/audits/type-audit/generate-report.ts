/**
 * Generates the committed audit report at `docs/type-audit-2026.md` from the
 * scanner's intermediate JSON. The classifier rules are encoded here (and
 * documented in the report's Methodology section). Re-running this script
 * against a fresh scan produces a byte-diffable updated report.
 *
 * Usage:
 *   pnpm tsx scripts/audits/type-audit/generate-report.ts \
 *     --in tmp/type-audit.json \
 *     --out docs/type-audit-2026.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ScanOutput, TypeDeclarationRecord, DriftCluster } from './scan.js';

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

type Classification =
  | 'schema-rooted'
  | 'boundary-loose'
  | 'single-domain'
  | 'cross-domain-hand-typed'
  | 'drift-candidate';

interface Finding {
  record: TypeDeclarationRecord;
  classification: Classification;
  summary: string;
  recommendedAction: string;
  justification: string | null;
  backlogItemRef: string | null;
}

/**
 * Patterns for declarations that cross the Python ↔ TypeScript boundary
 * and are not schema-rooted. These override the default `single-domain`
 * fallback when the record is not already auto-tagged.
 */
const CROSS_DOMAIN_NAME_PATTERNS: Array<{ re: RegExp; theme: string }> = [
  // MCP transport shapes (specifically prefixed MCP*).
  { re: /^MCP[A-Z]/, theme: 'mcp-transport' },

  // Tool-system shapes that cross the boundary (MCP tool definitions,
  // registry payloads, result envelopes). Excludes UI-adjacent `Toolbar*`
  // / `Tooltip*` by enumerating the cross-domain suffixes explicitly.
  {
    re: /^Tool(Result|ResultForLog|Execution[A-Z]|Executor|VersionResolver|Definition|Parameter|Param[A-Z]|Name|sUpdate|Offering|Context|Manifest|Registry)/,
    theme: 'mcp-transport',
  },

  // STAC hand-types
  { re: /^Stac(Item|Catalog|Collection|Asset|Link|Provider|Extent|SpatialExtent|TemporalExtent|Summaries)$/, theme: 'stac-handtypes' },

  // GeoJSON hand-types (overlaps with #204 RawGeoJSONFeature)
  { re: /^(GeoJson|GeoJSON)[A-Z]/, theme: 'geojson-handtypes' },
  { re: /^RawGeoJSON/, theme: 'geojson-handtypes' },

  // Session-state wire/persisted shapes
  { re: /^(StateSnapshot|FeatureProvenance|ModifiedFeature|InputFeatureState|BranchPointLocation|CreateSnapshotOptions)$/, theme: 'session-state-wire' },

  // Loader ↔ Main IPC envelopes
  { re: /^(CreatePlotResponse|AddFeaturesResponse|ListPlotsResponse|OpenPlotArgs|ParseResult)$/, theme: 'ipc-envelopes' },

  // Calc / tool result envelopes consumed across the boundary
  { re: /^(ToolResultEnvelope|ResultEnvelope|CalcResult)$/, theme: 'tool-result-envelope' },
];

/**
 * Declaration names whose drift cluster is a well-understood per-file
 * convention, not a semantic drift. These still classify as `drift-candidate`
 * (the mechanical rule is name-based) but their recommendedAction points to
 * a single rollup backlog item rather than forcing a per-cluster item.
 */
const LOCAL_CONVENTION_DRIFT_NAMES = new Set<string>(['Story', 'Props']);

function classify(record: TypeDeclarationRecord, driftNames: Set<string>): { classification: Classification; theme: string | null } {
  if (driftNames.has(record.declarationName) && isInDrift(record, driftNames)) {
    return { classification: 'drift-candidate', theme: null };
  }
  if (record.autoTag === 'drift-shortlist') {
    return { classification: 'drift-candidate', theme: null };
  }
  if (record.autoTag === 'boundary-candidate') {
    return { classification: 'boundary-loose', theme: null };
  }
  for (const { re, theme } of CROSS_DOMAIN_NAME_PATTERNS) {
    if (re.test(record.declarationName)) {
      if (record.autoTag !== 'schema-rooted-candidate') {
        return { classification: 'cross-domain-hand-typed', theme };
      }
    }
  }
  if (record.autoTag === 'schema-rooted-candidate') {
    return { classification: 'schema-rooted', theme: null };
  }
  return { classification: 'single-domain', theme: null };
}

function isInDrift(record: TypeDeclarationRecord, driftNames: Set<string>): boolean {
  return driftNames.has(record.declarationName);
}

// ---------------------------------------------------------------------------
// One-line summary per record
// ---------------------------------------------------------------------------

function summariseRecord(record: TypeDeclarationRecord, classification: Classification): string {
  const kindLabel = record.kind === 'type' ? 'type alias' : record.kind;
  if (classification === 'boundary-loose') {
    return `${kindLabel} bottoming out in \`${record.rhsSummary ?? 'unknown'}\``;
  }
  if (classification === 'schema-rooted') {
    return `${kindLabel} in a file importing from \`@debrief/schemas\``;
  }
  if (record.kind === 'type' && record.rhsSummary) {
    const rhs = record.rhsSummary.length > 70 ? record.rhsSummary.slice(0, 69) + '…' : record.rhsSummary;
    return `${kindLabel} = \`${rhs}\``;
  }
  return `${kindLabel} \`${record.declarationName}\``;
}

// ---------------------------------------------------------------------------
// Backlog wiring
// ---------------------------------------------------------------------------

interface BacklogEntry {
  id: number;
  title: string;
  url: string;
  /** true if opened as part of this audit PR */
  isNew: boolean;
}

/**
 * The set of backlog items the audit recommends for each actionable theme.
 * Existing items (#203, #204, #205) are re-used where scope matches.
 */
const BACKLOG_TABLE: Record<string, BacklogEntry> = {
  'mcp-transport': {
    id: 224,
    title: '[E11] Promote MCP transport envelopes (request / response / content item / tool definition / param schema) to LinkML',
    url: 'BACKLOG.md#mcp-transport',
    isNew: true,
  },
  'stac-handtypes': {
    id: 225,
    title: '[E11] Promote STAC catalog hand-types (StacItem / StacCatalog / StacCollection) to LinkML — replace hand-authored aliases in apps/vscode/src/types/stac.ts + apps/web-shell/src/mocks/stacService.ts',
    url: 'BACKLOG.md#stac-handtypes',
    isNew: true,
  },
  'geojson-handtypes': {
    id: 204,
    title: 'RawGeoJSONFeature — already-open E11 child that covers GeoJSON hand-types',
    url: 'BACKLOG.md#204',
    isNew: false,
  },
  'session-state-wire': {
    id: 226,
    title: '[E11] Promote session-state wire shapes (StateSnapshot / FeatureProvenance / ModifiedFeature / InputFeatureState / BranchPointLocation / CreateSnapshotOptions) to LinkML',
    url: 'BACKLOG.md#session-state-wire',
    isNew: true,
  },
  'ipc-envelopes': {
    id: 227,
    title: '[E11] Promote loader↔main IPC envelopes (CreatePlotResponse / AddFeaturesResponse / ListPlotsResponse / OpenPlotArgs / ParseResult) to LinkML — wire shapes shared between Electron main/renderer and VS Code extension',
    url: 'BACKLOG.md#ipc-envelopes',
    isNew: true,
  },
  'tool-result-envelope': {
    id: 228,
    title: '[E11] Promote tool-result envelope (ToolResultEnvelope / CalcResult / ToolContext) to LinkML — currently hand-authored in TS and consumed by debrief-calc on the Python side',
    url: 'BACKLOG.md#tool-result-envelope',
    isNew: true,
  },
  // Drift rollups
  'drift-real': {
    id: 229,
    title: '[E11] Resolve real drift clusters surfaced by the type-audit — same-name different-shape declarations that indicate unintended semantic divergence (excludes Storybook Story / React Props per-file conventions)',
    url: 'BACKLOG.md#drift-real',
    isNew: true,
  },
  'drift-convention': {
    id: 230,
    title: '[E11] Storybook / React component local-convention drift rollup — Story (38 sites) and Props (14 sites) re-declarations are per-file conventions rather than semantic drift; treat as no-action but document in a rollup so future audits can ignore them',
    url: 'BACKLOG.md#drift-convention',
    isNew: true,
  },
};

function recommendAction(finding: Finding, driftClusters: DriftCluster[]): { action: string; backlogItemRef: string | null } {
  switch (finding.classification) {
    case 'schema-rooted':
      return { action: 'No action — already schema-rooted via `@debrief/schemas` import.', backlogItemRef: null };
    case 'boundary-loose':
      return {
        action: `Confirm boundary use is intentional; if the shape is knowable, promote to LinkML (feeds #${BACKLOG_TABLE['tool-result-envelope'].id} for envelope shapes).`,
        backlogItemRef: null,
      };
    case 'single-domain':
      return { action: 'Keep — single-domain convenience type (no Python counterpart).', backlogItemRef: null };
    case 'cross-domain-hand-typed': {
      // theme is stashed on the finding during classification
      const theme = finding.justification; // we re-purposed justification temporarily
      if (theme && BACKLOG_TABLE[theme]) {
        const item = BACKLOG_TABLE[theme];
        const verb = item.isNew ? 'Open' : 'Fold into';
        return {
          action: `${verb} #${item.id} — ${item.title.split(' — ')[0]}.`,
          backlogItemRef: `#${item.id}`,
        };
      }
      return {
        action: `Open new backlog item — cross-domain hand-typed with no existing owner.`,
        backlogItemRef: null,
      };
    }
    case 'drift-candidate': {
      const name = finding.record.declarationName;
      if (LOCAL_CONVENTION_DRIFT_NAMES.has(name)) {
        const item = BACKLOG_TABLE['drift-convention'];
        return {
          action: `Fold into #${item.id} — ${name} is a well-understood per-file convention (not semantic drift).`,
          backlogItemRef: `#${item.id}`,
        };
      }
      // Check if this drift cluster's members include any existing E11 child's scope.
      // For now, route all real drift to #229 (the audit's general drift rollup).
      const item = BACKLOG_TABLE['drift-real'];
      // Find which cluster this record is in to reference sibling members.
      const cluster = driftClusters.find((c) => c.memberIds.includes(finding.record.id));
      const siblings = cluster
        ? cluster.memberIds.filter((id) => id !== finding.record.id).length
        : 0;
      return {
        action: `Open #${item.id} — drift cluster "${name}" (${siblings + 1} members).`,
        backlogItemRef: `#${item.id}`,
      };
    }
  }
}

function justifySingleDomain(record: TypeDeclarationRecord): string {
  if (/Props$|State$|Config$|Options$|Context$|Handle$|Ref$/.test(record.declarationName)) {
    return 'React / hook local state — UI runtime only, no Python counterpart.';
  }
  if (record.filePath.includes('/stories/') || record.filePath.endsWith('.stories.tsx')) {
    return 'Storybook story type — development-time only, not shipped.';
  }
  if (record.packageName === '@debrief/spec-navigator') {
    return 'Spec-navigator internal type — SPA state, no Python counterpart.';
  }
  return 'TS-only convenience type — no cross-boundary serialisation.';
}

// ---------------------------------------------------------------------------
// Report emission
// ---------------------------------------------------------------------------

function escapeTable(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function emitFindingsTable(title: string, findings: Finding[]): string {
  if (findings.length === 0) {
    return `### ${title}\n\n_No findings in this bucket._\n`;
  }
  const header = `### ${title} (${findings.length})\n\n| # | Package | File : Line | Name | Summary | Recommended action |\n|---|---------|-------------|------|---------|---------------------|`;
  const rows = findings.map((f, i) => {
    const pkg = f.record.packageName || '(root)';
    const where = `\`${f.record.filePath}:${f.record.lineNumber}\``;
    const name = `\`${f.record.declarationName}\``;
    const summary = escapeTable(f.summary);
    const action = escapeTable(f.recommendedAction);
    return `| ${i + 1} | ${pkg} | ${where} | ${name} | ${summary} | ${action} |`;
  });
  return [header, ...rows].join('\n') + '\n';
}

function emitReport(scan: ScanOutput, findings: Finding[]): string {
  const byClass: Record<Classification, Finding[]> = {
    'schema-rooted': [],
    'boundary-loose': [],
    'single-domain': [],
    'cross-domain-hand-typed': [],
    'drift-candidate': [],
  };
  for (const f of findings) byClass[f.classification].push(f);

  // Stable ordering inside each bucket: package → filepath → line → name
  for (const key of Object.keys(byClass) as Classification[]) {
    byClass[key].sort(
      (a, b) =>
        (a.record.packageName || '~').localeCompare(b.record.packageName || '~') ||
        a.record.filePath.localeCompare(b.record.filePath) ||
        a.record.lineNumber - b.record.lineNumber ||
        a.record.declarationName.localeCompare(b.record.declarationName),
    );
  }

  const newItems = Object.values(BACKLOG_TABLE).filter((b) => b.isNew);

  const today = scan.capturedAt.slice(0, 10);
  const body = `---
feature: 206-audit-non-linkml-types
epic: E11
captured_at: ${today}
git_sha: ${scan.gitSha}
scanner_version: ${scan.scannerVersion}
---

# Type-declaration audit — Debrief monorepo (2026)

Back-link: this audit is the first deliverable under Epic **E11 — Schema-First
Boundary Typing**, tracked at [docs/ideas/E11-schema-first-boundary-typing.md](ideas/E11-schema-first-boundary-typing.md).
Its purpose is to enumerate every named TypeScript \`interface\` / \`type\` /
\`enum\` under \`apps/\`, \`shared/\`, and \`services/\` (excluding generated and
test-local code) and classify each declaration so that the phase list for E11
is driven by evidence, not intuition.

## 1. Summary

| Metric | Count |
|--------|-------|
| In-scope declarations scanned | ${scan.records.length} |
| Drift clusters (same-name + different-shape) | ${scan.driftClusters.length} |
| Files traversed | ${new Set(scan.records.map((r) => r.filePath)).size} |
| Schema-rooted | ${byClass['schema-rooted'].length} |
| Boundary / parse-time loose | ${byClass['boundary-loose'].length} |
| Single-domain convenience | ${byClass['single-domain'].length} |
| Cross-domain hand-typed | ${byClass['cross-domain-hand-typed'].length} |
| Drift candidate | ${byClass['drift-candidate'].length} |

### Newly opened backlog items

${newItems.length === 0 ? '_None — all actionable findings folded into existing items._' : newItems
    .map((item) => `- **#${item.id}** — ${item.title}`)
    .join('\n')}

### Existing items reused

${Object.values(BACKLOG_TABLE)
  .filter((b) => !b.isNew)
  .map((item) => `- **#${item.id}** — ${item.title}`)
  .join('\n')}

## 2. Methodology

### 2.1 Scope

| Aspect | Value |
|--------|-------|
| In-scope roots | \`apps/\`, \`shared/\`, \`services/\` |
| Excluded paths | \`shared/schemas/src/generated/**\`, \`**/__tests__/**\`, \`**/__fixtures__/**\`, \`**/*.test.ts\`, \`**/*.spec.ts\`, \`**/node_modules/**\`, \`**/dist/**\` |
| Generator output boundary | Path-based — anything under \`shared/schemas/src/generated/\` is authoritative (LinkML-generated) and excluded. |

### 2.2 Declaration extraction

- Uses the **TypeScript compiler API** via
  \`scripts/audits/type-audit/scan.ts\`.
- Traverses every \`.ts\` / \`.tsx\` / \`.d.ts\` file in scope, emitting one
  record per top-level \`InterfaceDeclaration\`, \`TypeAliasDeclaration\`, or
  \`EnumDeclaration\`.
- Records are stable-sorted by \`\${packageName}:\${filePath}:\${declarationName}\`
  for diff-friendly output. SHA-1 shape hashes power drift detection.
- Output contract: \`specs/206-audit-non-linkml-types/contracts/scan-output.schema.json\`.

### 2.3 Classification rules (applied in order)

| Rule | Trigger | Classification |
|------|---------|----------------|
| R1   | Declaration name is in a drift cluster (≥ 2 sites, distinct shape hashes). | \`drift-candidate\` |
| R2   | Type-alias RHS bottoms out in \`unknown\` / \`any\` / \`Record<string, unknown>\` / \`Record<string, any>\` (transitively through unions / intersections / parens). | \`boundary-loose\` |
| R3   | Declaration name matches one of the committed cross-domain name patterns (MCP\\*, Stac\\*, GeoJson\\*, StateSnapshot / FeatureProvenance / ModifiedFeature / InputFeatureState / BranchPointLocation / CreateSnapshotOptions, CreatePlotResponse / AddFeaturesResponse / ListPlotsResponse / OpenPlotArgs / ParseResult, ToolResultEnvelope / CalcResult / ToolContext) **and** the containing file does not import \`@debrief/schemas\`. | \`cross-domain-hand-typed\` |
| R4   | Containing file imports from \`@debrief/schemas\` (or any \`@debrief/schemas/*\` sub-path). | \`schema-rooted\` |
| R5   | Fallback. | \`single-domain\` |

The cross-domain name patterns in R3 are committed in
\`scripts/audits/type-audit/generate-report.ts\` (constant
\`CROSS_DOMAIN_NAME_PATTERNS\`). To extend the audit, edit that constant and
re-run \`pnpm tsx scripts/audits/type-audit/generate-report.ts\`.

### 2.4 Re-run

\`\`\`bash
# 1. Scan
mkdir -p tmp
pnpm tsx scripts/audits/type-audit/scan.ts \\
  --roots apps shared services \\
  --exclude "shared/schemas/src/generated/**" \\
  --exclude "**/__tests__/**" \\
  --exclude "**/__fixtures__/**" \\
  --exclude "**/*.test.ts" \\
  --exclude "**/*.spec.ts" \\
  --exclude "**/node_modules/**" \\
  --exclude "**/dist/**" \\
  --out tmp/type-audit.json

# 2. Validate (belt-and-braces — scanner tests already enforce this)
#    Inline Ajv validation is trivial; the scanner's own vitest suite
#    includes a contract test against scan-output.schema.json.

# 3. Regenerate this report
pnpm tsx scripts/audits/type-audit/generate-report.ts \\
  --in tmp/type-audit.json \\
  --out docs/type-audit-2026.md
\`\`\`

### 2.5 Known gaps / caveats

- Per-file convention drift (Storybook \`Story\`, React component \`Props\`) is
  mechanically flagged by R1 but folded into a single rollup backlog item
  (#${BACKLOG_TABLE['drift-convention'].id}) rather than treated as semantic
  drift. Future audits should keep the mechanical rule honest and only suppress
  at the backlog-linkage level.
- R3 cross-domain detection is **name-based, not shape-based**. A type that
  crosses the Python ↔ TS boundary under a non-matching name (e.g.
  \`PlotDescriptor\`, \`SceneLayout\`) will fall through to \`single-domain\`
  unless the reviewer extends \`CROSS_DOMAIN_NAME_PATTERNS\`. The audit errs
  on the side of not opening backlog noise; follow-up E11 phases should
  re-run with additions.
- Declarations inside \`.d.ts\` files authored in-repo are included; declarations
  inside \`node_modules/\` are not. No generated output was found outside
  \`shared/schemas/src/generated/\` during this run.
- The scanner does not resolve re-exports. A file that \`export { Coordinate }
  from '@debrief/schemas'\` is still classified via R4 (its file imports from
  \`@debrief/schemas\`). A re-export that deliberately shadows a schema type
  would not be distinguished.

## 3. Findings

The table for each bucket below includes every in-scope declaration exactly
once (spec SC-001). Rows are stable-sorted by package → file path → line
number → declaration name so re-runs produce diff-friendly output.

${emitFindingsTable('3.1 Cross-domain hand-typed', byClass['cross-domain-hand-typed'])}

${emitFindingsTable('3.2 Drift candidate', byClass['drift-candidate'])}

${emitFindingsTable('3.3 Boundary / parse-time loose', byClass['boundary-loose'])}

${emitFindingsTable('3.4 Schema-rooted', byClass['schema-rooted'])}

${emitFindingsTable('3.5 Single-domain convenience', byClass['single-domain'])}

## 4. Python cross-domain appendix

_Populated in Phase 5 — see §4 in the final committed report._

## 5. Re-run log / changelog

| Date | Commit | Outcome |
|------|--------|---------|
| ${today} | \`${scan.gitSha.slice(0, 8)}\` | Initial audit — ${scan.records.length} declarations, ${scan.driftClusters.length} drift clusters. |
`;

  return body;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { inPath: string; outPath: string } {
  let inPath = 'tmp/type-audit.json';
  let outPath = 'docs/type-audit-2026.md';
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--in' && value) inPath = value;
    else if (flag === '--out' && value) outPath = value;
    else throw new Error(`Unknown or value-less flag: ${flag}`);
  }
  return { inPath, outPath };
}

async function runCli(): Promise<void> {
  const { inPath, outPath } = parseArgs(process.argv.slice(2));
  const scan = JSON.parse(fs.readFileSync(inPath, 'utf8')) as ScanOutput;

  // Precompute the set of declaration names that participate in real drift
  // clusters (≥2 members AND distinct shape hashes). The scanner's
  // driftClusters already satisfies this constraint.
  const driftNames = new Set(scan.driftClusters.map((c) => c.declarationName));

  const findings: Finding[] = scan.records.map((record) => {
    const { classification, theme } = classify(record, driftNames);
    const summary = summariseRecord(record, classification);
    const partial: Finding = {
      record,
      classification,
      summary,
      justification:
        classification === 'single-domain'
          ? justifySingleDomain(record)
          : classification === 'cross-domain-hand-typed'
            ? theme
            : null,
      recommendedAction: '',
      backlogItemRef: null,
    };
    const { action, backlogItemRef } = recommendAction(partial, scan.driftClusters);
    partial.recommendedAction = action;
    partial.backlogItemRef = backlogItemRef;
    if (classification === 'single-domain') {
      partial.justification = justifySingleDomain(record);
    } else if (classification !== 'cross-domain-hand-typed') {
      partial.justification = null;
    }
    return partial;
  });

  const report = emitReport(scan, findings);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, report, 'utf8');

  // Stderr summary
  const counts: Record<Classification, number> = {
    'schema-rooted': 0,
    'boundary-loose': 0,
    'single-domain': 0,
    'cross-domain-hand-typed': 0,
    'drift-candidate': 0,
  };
  for (const f of findings) counts[f.classification] += 1;
  process.stderr.write(
    `Wrote ${outPath}: ${findings.length} findings ` +
      `(schema-rooted=${counts['schema-rooted']}, ` +
      `boundary-loose=${counts['boundary-loose']}, ` +
      `single-domain=${counts['single-domain']}, ` +
      `cross-domain-hand-typed=${counts['cross-domain-hand-typed']}, ` +
      `drift-candidate=${counts['drift-candidate']})\n`,
  );
}

const invokedDirectly =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) {
  runCli().catch((err) => {
    process.stderr.write(`generate-report failed: ${(err as Error).message}\n`);
    process.exit(1);
  });
}

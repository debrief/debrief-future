/**
 * Type-audit scanner — walks in-scope TypeScript source with the compiler API
 * and emits one record per named interface / type-alias / enum declaration.
 *
 * Output contract: specs/206-audit-non-linkml-types/contracts/scan-output.schema.json
 * Design:          specs/206-audit-non-linkml-types/plan.md
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// ---------------------------------------------------------------------------
// Types (mirror the JSON-Schema contract; the test in scan.contract.test.ts
// validates runtime output against the committed schema).
// ---------------------------------------------------------------------------

export type AutoTag =
  | 'schema-rooted-candidate'
  | 'boundary-candidate'
  | 'drift-shortlist'
  | 'none';

export type DeclarationKind = 'interface' | 'type' | 'enum';

export interface TypeDeclarationRecord {
  id: string;
  packageName: string;
  filePath: string;
  lineNumber: number;
  declarationName: string;
  kind: DeclarationKind;
  isExported: boolean;
  shapeHash: string;
  rhsSummary: string | null;
  imports: string[];
  autoTag: AutoTag;
}

export interface DriftCluster {
  declarationName: string;
  memberIds: string[];
}

export interface ScanOutput {
  scannerVersion: string;
  capturedAt: string;
  gitSha: string;
  scannedPaths: string[];
  excludedPaths: string[];
  records: TypeDeclarationRecord[];
  driftClusters: DriftCluster[];
}

export interface ScanOptions {
  repoRoot: string;
  roots: string[];
  excludes: string[];
  /** If true, skip reading `git rev-parse HEAD` (useful when running outside a repo). */
  skipGitSha?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCANNER_VERSION = 'v1';
const MAX_RHS_SUMMARY = 160;

// ---------------------------------------------------------------------------
// Glob matching — minimal inline implementation. We support the subset of
// patterns actually used by the spec: `**/foo/**`, `**/*.ext`, `prefix/**`.
// Keeping this in-file avoids another dependency for a one-shot tool.
// ---------------------------------------------------------------------------

function globToRegex(glob: string): RegExp {
  // Normalise backslashes. All paths we test are forward-slash-normalised.
  let pattern = glob.replace(/\\/g, '/');
  let regex = '^';
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        // `**` — match any number of path segments (possibly zero).
        // Handle `**/` → segments-or-nothing, and bare `**` → `.*`.
        if (pattern[i + 2] === '/') {
          regex += '(?:.*/)?';
          i += 3;
          continue;
        }
        regex += '.*';
        i += 2;
        continue;
      }
      // Single `*` — match within one path segment.
      regex += '[^/]*';
      i += 1;
      continue;
    }
    if (c === '.' || c === '+' || c === '(' || c === ')' || c === '|' || c === '^' || c === '$' || c === '{' || c === '}' || c === '[' || c === ']' || c === '\\' || c === '?') {
      regex += '\\' + c;
      i += 1;
      continue;
    }
    regex += c;
    i += 1;
  }
  regex += '$';
  return new RegExp(regex);
}

function matchesAnyGlob(relPath: string, globs: string[]): boolean {
  const normalised = relPath.replace(/\\/g, '/');
  for (const g of globs) {
    if (globToRegex(g).test(normalised)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Package-name resolution — walk upwards from a file looking for package.json.
// Cached per directory.
// ---------------------------------------------------------------------------

const PACKAGE_NAME_CACHE = new Map<string, string>();

function getPackageName(filePath: string, repoRoot: string): string {
  let dir = path.dirname(filePath);
  const rootAbs = path.resolve(repoRoot);
  while (dir.startsWith(rootAbs) && dir !== rootAbs) {
    const cached = PACKAGE_NAME_CACHE.get(dir);
    if (cached !== undefined) return cached;
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { name?: string };
        const name = typeof pkg.name === 'string' ? pkg.name : '';
        PACKAGE_NAME_CACHE.set(dir, name);
        return name;
      } catch {
        PACKAGE_NAME_CACHE.set(dir, '');
        return '';
      }
    }
    dir = path.dirname(dir);
  }
  return '';
}

// ---------------------------------------------------------------------------
// File enumeration
// ---------------------------------------------------------------------------

function* walkTypeScriptFiles(rootAbs: string): Generator<string> {
  if (!fs.existsSync(rootAbs)) return;
  const stack = [rootAbs];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        // Hard-skip node_modules and hidden dirs regardless of user excludes.
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        stack.push(full);
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.d.ts')) {
          yield full;
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// AST inspection
// ---------------------------------------------------------------------------

function getImportSpecifiers(sourceFile: ts.SourceFile): string[] {
  const specs = new Set<string>();
  for (const stmt of sourceFile.statements) {
    if (ts.isImportDeclaration(stmt)) {
      const mod = stmt.moduleSpecifier;
      if (ts.isStringLiteral(mod)) specs.add(mod.text);
    } else if (ts.isExportDeclaration(stmt) && stmt.moduleSpecifier) {
      const mod = stmt.moduleSpecifier;
      if (ts.isStringLiteral(mod)) specs.add(mod.text);
    }
  }
  return [...specs].sort();
}

function hasExportModifier(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function computeShapeHash(node: ts.Node, sourceFile: ts.SourceFile): string {
  // Use the declaration's text, with whitespace-runs collapsed, as the hash
  // input. This is stable across runs and ignores cosmetic whitespace
  // differences while preserving structural differences.
  const raw = node.getText(sourceFile);
  const normalised = raw.replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha1').update(normalised).digest('hex');
}

function summariseRhs(typeNode: ts.TypeNode, sourceFile: ts.SourceFile): string {
  const raw = typeNode.getText(sourceFile).replace(/\s+/g, ' ').trim();
  return raw.length <= MAX_RHS_SUMMARY ? raw : raw.slice(0, MAX_RHS_SUMMARY - 1) + '…';
}

/** Recursively test whether the type-node contains a "loose" construct. */
function isBoundaryLooseType(typeNode: ts.TypeNode): boolean {
  // Flatten unions and intersections.
  if (ts.isUnionTypeNode(typeNode) || ts.isIntersectionTypeNode(typeNode)) {
    return typeNode.types.some(isBoundaryLooseType);
  }
  // `unknown`
  if (typeNode.kind === ts.SyntaxKind.UnknownKeyword) return true;
  // `any`
  if (typeNode.kind === ts.SyntaxKind.AnyKeyword) return true;
  // Parenthesised type — unwrap.
  if (ts.isParenthesizedTypeNode(typeNode)) return isBoundaryLooseType(typeNode.type);
  // `Record<string, unknown>` / `Record<string, any>`
  if (ts.isTypeReferenceNode(typeNode)) {
    const name = typeNode.typeName;
    const nameText = ts.isIdentifier(name) ? name.text : name.getText();
    if (nameText === 'Record' && typeNode.typeArguments && typeNode.typeArguments.length === 2) {
      const keyArg = typeNode.typeArguments[0];
      const valueArg = typeNode.typeArguments[1];
      if (!keyArg || !valueArg) return false;
      const keyIsString =
        keyArg.kind === ts.SyntaxKind.StringKeyword ||
        (ts.isLiteralTypeNode(keyArg) && keyArg.literal.kind === ts.SyntaxKind.StringLiteral);
      if (keyIsString && isBoundaryLooseType(valueArg)) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

interface RawDecl {
  node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration;
  kind: DeclarationKind;
  name: string;
  filePath: string;
  sourceFile: ts.SourceFile;
  relativeFilePath: string;
  packageName: string;
  imports: string[];
}

function extractDeclarations(
  sourceFile: ts.SourceFile,
  filePathAbs: string,
  repoRoot: string,
): RawDecl[] {
  const relativeFilePath = path
    .relative(repoRoot, filePathAbs)
    .replace(/\\/g, '/');
  const packageName = getPackageName(filePathAbs, repoRoot);
  const imports = getImportSpecifiers(sourceFile);
  const out: RawDecl[] = [];
  for (const stmt of sourceFile.statements) {
    if (ts.isInterfaceDeclaration(stmt)) {
      out.push({
        node: stmt,
        kind: 'interface',
        name: stmt.name.text,
        filePath: filePathAbs,
        sourceFile,
        relativeFilePath,
        packageName,
        imports,
      });
    } else if (ts.isTypeAliasDeclaration(stmt)) {
      out.push({
        node: stmt,
        kind: 'type',
        name: stmt.name.text,
        filePath: filePathAbs,
        sourceFile,
        relativeFilePath,
        packageName,
        imports,
      });
    } else if (ts.isEnumDeclaration(stmt)) {
      out.push({
        node: stmt,
        kind: 'enum',
        name: stmt.name.text,
        filePath: filePathAbs,
        sourceFile,
        relativeFilePath,
        packageName,
        imports,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Auto-tagging
// ---------------------------------------------------------------------------

const SCHEMA_IMPORT_PREFIX = '@debrief/schemas';

function importsSchemaPackage(imports: string[]): boolean {
  return imports.some(
    (spec) => spec === SCHEMA_IMPORT_PREFIX || spec.startsWith(SCHEMA_IMPORT_PREFIX + '/'),
  );
}

function computeAutoTag(args: {
  kind: DeclarationKind;
  node: ts.Node;
  imports: string[];
  isInDriftCluster: boolean;
}): AutoTag {
  // Precedence: drift-shortlist > schema-rooted-candidate > boundary-candidate > none
  if (args.isInDriftCluster) return 'drift-shortlist';
  if (importsSchemaPackage(args.imports)) return 'schema-rooted-candidate';
  if (args.kind === 'type') {
    const aliasNode = args.node as ts.TypeAliasDeclaration;
    if (isBoundaryLooseType(aliasNode.type)) return 'boundary-candidate';
  }
  return 'none';
}

// ---------------------------------------------------------------------------
// Git SHA
// ---------------------------------------------------------------------------

function readGitSha(repoRoot: string): string {
  try {
    return execSync('git rev-parse HEAD', { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

// ---------------------------------------------------------------------------
// Public scan() entry point
// ---------------------------------------------------------------------------

export async function scan(options: ScanOptions): Promise<ScanOutput> {
  const repoRoot = path.resolve(options.repoRoot);
  const excludes = options.excludes;

  // ---- Enumerate source files ------------------------------------------------
  const candidateFiles: string[] = [];
  for (const root of options.roots) {
    const rootAbs = path.resolve(root);
    for (const fileAbs of walkTypeScriptFiles(rootAbs)) {
      const relative = path.relative(repoRoot, fileAbs).replace(/\\/g, '/');
      if (matchesAnyGlob(relative, excludes)) continue;
      candidateFiles.push(fileAbs);
    }
  }
  // Stable file order for determinism.
  candidateFiles.sort();

  // ---- Parse + extract raw declarations -------------------------------------
  const rawDecls: RawDecl[] = [];
  for (const fileAbs of candidateFiles) {
    let text: string;
    try {
      text = fs.readFileSync(fileAbs, 'utf8');
    } catch {
      continue;
    }
    const sourceFile = ts.createSourceFile(fileAbs, text, ts.ScriptTarget.Latest, true);
    rawDecls.push(...extractDeclarations(sourceFile, fileAbs, repoRoot));
  }

  // ---- Build interim records so we can compute drift clusters ---------------
  interface Interim {
    id: string;
    raw: RawDecl;
    shapeHash: string;
    rhsSummary: string | null;
    isExported: boolean;
    lineNumber: number;
  }

  const interim: Interim[] = rawDecls.map((raw) => {
    const pos = raw.sourceFile.getLineAndCharacterOfPosition(raw.node.getStart(raw.sourceFile));
    const id = `${raw.packageName}:${raw.relativeFilePath}:${raw.name}`;
    const shapeHash = computeShapeHash(raw.node, raw.sourceFile);
    const rhsSummary =
      raw.kind === 'type'
        ? summariseRhs((raw.node as ts.TypeAliasDeclaration).type, raw.sourceFile)
        : null;
    return {
      id,
      raw,
      shapeHash,
      rhsSummary,
      isExported: hasExportModifier(raw.node),
      lineNumber: pos.line + 1,
    };
  });

  // ---- Detect drift clusters -------------------------------------------------
  const byName = new Map<string, Interim[]>();
  for (const i of interim) {
    const bucket = byName.get(i.raw.name);
    if (bucket) bucket.push(i);
    else byName.set(i.raw.name, [i]);
  }
  const driftMemberIds = new Set<string>();
  const driftClusters: DriftCluster[] = [];
  for (const [name, members] of byName.entries()) {
    if (members.length < 2) continue;
    const hashes = new Set(members.map((m) => m.shapeHash));
    if (hashes.size < 2) continue;
    const memberIds = members.map((m) => m.id).sort();
    driftClusters.push({ declarationName: name, memberIds });
    for (const id of memberIds) driftMemberIds.add(id);
  }
  driftClusters.sort((a, b) => a.declarationName.localeCompare(b.declarationName));

  // ---- Finalise records ------------------------------------------------------
  const records: TypeDeclarationRecord[] = interim.map((i) => {
    const autoTag = computeAutoTag({
      kind: i.raw.kind,
      node: i.raw.node,
      imports: i.raw.imports,
      isInDriftCluster: driftMemberIds.has(i.id),
    });
    return {
      id: i.id,
      packageName: i.raw.packageName,
      filePath: i.raw.relativeFilePath,
      lineNumber: i.lineNumber,
      declarationName: i.raw.name,
      kind: i.raw.kind,
      isExported: i.isExported,
      shapeHash: i.shapeHash,
      rhsSummary: i.rhsSummary,
      imports: i.raw.imports,
      autoTag,
    };
  });
  // Stable sort by id for diff-friendly output.
  records.sort((a, b) => a.id.localeCompare(b.id));

  const gitSha = options.skipGitSha ? 'skipped' : readGitSha(repoRoot);

  return {
    scannerVersion: SCANNER_VERSION,
    capturedAt: new Date().toISOString(),
    gitSha,
    scannedPaths: options.roots.map((r) => path.relative(repoRoot, path.resolve(r)).replace(/\\/g, '/') || '.'),
    excludedPaths: [...excludes],
    records,
    driftClusters,
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

interface CliArgs {
  roots: string[];
  excludes: string[];
  out: string;
}

function parseArgs(argv: string[]): CliArgs {
  const roots: string[] = [];
  const excludes: string[] = [];
  let out = 'tmp/type-audit.json';
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === '--roots') {
      i += 1;
      while (i < argv.length) {
        const next = argv[i];
        if (next === undefined || next.startsWith('--')) break;
        roots.push(next);
        i += 1;
      }
      continue;
    }
    if (a === '--exclude') {
      const value = argv[i + 1];
      if (value !== undefined) {
        excludes.push(value);
        i += 2;
        continue;
      }
      throw new Error('--exclude requires a value');
    }
    if (a === '--out') {
      const value = argv[i + 1];
      if (value !== undefined) {
        out = value;
        i += 2;
        continue;
      }
      throw new Error('--out requires a value');
    }
    throw new Error(`Unknown flag: ${a}`);
  }
  if (roots.length === 0) {
    roots.push('apps', 'shared', 'services');
  }
  return { roots, excludes, out };
}

async function runCli(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const output = await scan({
    repoRoot,
    roots: args.roots,
    excludes: args.excludes,
  });

  const outAbs = path.resolve(repoRoot, args.out);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, JSON.stringify(output, null, 2) + '\n', 'utf8');

  // Count per autoTag for the stderr summary.
  const buckets: Record<AutoTag, number> = {
    'schema-rooted-candidate': 0,
    'boundary-candidate': 0,
    'drift-shortlist': 0,
    none: 0,
  };
  for (const r of output.records) buckets[r.autoTag] += 1;

  const summary = [
    `Scanned ${new Set(output.records.map((r) => r.filePath)).size} files`,
    `emitted ${output.records.length} records`,
    `${output.driftClusters.length} drift clusters`,
  ].join(', ');
  const bucketSummary = Object.entries(buckets)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ');
  process.stderr.write(`${summary} [${bucketSummary}]\n`);
  process.stderr.write(`Wrote ${path.relative(repoRoot, outAbs)}\n`);
}

// Run the CLI only when this module is invoked directly (not imported from a test).
const invokedDirectly =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) {
  runCli().catch((err) => {
    process.stderr.write(`type-audit scanner failed: ${(err as Error).message}\n`);
    process.exit(1);
  });
}

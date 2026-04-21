// @ts-check
/**
 * Drift-rule factory for `no-restricted-syntax` entries that block
 * `apps/*` files from redeclaring names already exported by a `@debrief/*`
 * package.
 *
 * Feature #214 — see specs/214-utils-drift-guard/ for full context. Reused
 * by five per-package caller modules (`no-redeclare-<pkg>-exports.cjs`) that
 * invoke this factory with the right `packageName` / `indexPath` pair.
 *
 * Contract: specs/214-utils-drift-guard/contracts/rule-contract.md §1.0.
 */

const fs = require('fs');
const path = require('path');

function loadTypescript() {
  // pnpm does not hoist `typescript` to the repo root, so a plain
  // `require('typescript')` from this file's directory fails. Probe a handful
  // of locations that are guaranteed to have it installed (the apps and
  // shared packages that depend on it) and return the first resolved copy.
  const candidatePaths = [
    __dirname,
    process.cwd(),
    path.resolve(__dirname, '..', '..'),
    path.resolve(__dirname, '..', 'utils'),
    path.resolve(__dirname, '..', 'components'),
    path.resolve(__dirname, '..', 'schemas'),
    path.resolve(__dirname, '..', 'data'),
    path.resolve(__dirname, '..', '..', 'apps', 'vscode'),
    path.resolve(__dirname, '..', '..', 'apps', 'loader'),
    path.resolve(__dirname, '..', '..', 'apps', 'web-shell'),
    path.resolve(__dirname, '..', '..', 'apps', 'spec-navigator'),
    path.resolve(__dirname, '..', '..', 'services', 'session-state'),
  ];
  for (const base of candidatePaths) {
    try {
      const resolved = require.resolve('typescript', { paths: [base] });
      return require(resolved);
    } catch (_err) {
      // Try the next candidate.
    }
  }
  throw new Error(
    `drift-rule-factory: could not resolve 'typescript' from any of: ${candidatePaths.join(', ')}`,
  );
}

const ts = loadTypescript();

/**
 * @typedef {Object} DriftRuleFactoryInput
 * @property {string} packageName   - e.g. '@debrief/utils'
 * @property {string} indexPath     - absolute (or caller-resolved) path to the package's barrel .ts
 * @property {string} [anchorDir]   - directory the transitive export * walker is bounded to
 */

/**
 * @typedef {{ selector: string, message: string }} RestrictedSyntaxEntry
 */

/**
 * @param {string} absolutePath
 * @returns {import('typescript').SourceFile}
 */
function parseIndexTs(absolutePath) {
  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `drift-rule-factory: indexPath not readable at ${absolutePath}`,
    );
  }
  const source = fs.readFileSync(absolutePath, 'utf8');
  return ts.createSourceFile(
    absolutePath,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
  );
}

/**
 * Resolve a relative export-star specifier (stripping `.js` / `.cjs` / `.mjs`
 * suffixes TypeScript tolerates) to an on-disk `.ts` / `.tsx` file.
 *
 * @param {string} specifier
 * @param {string} anchorDir
 * @returns {string | null}
 */
function resolveRelativeSpecifier(specifier, anchorDir) {
  // Strip JS-style runtime suffixes so we end up at the TypeScript source.
  let stripped = specifier;
  for (const suffix of ['.js', '.cjs', '.mjs']) {
    if (stripped.endsWith(suffix)) {
      stripped = stripped.slice(0, -suffix.length);
      break;
    }
  }
  const base = path.resolve(anchorDir, stripped);
  const candidates = [
    base + '.ts',
    base + '.tsx',
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Walk top-level export declarations of `sourceFile` and accumulate exported
 * names. Transitively follows relative `export * from './...'` forwards within
 * the same package's `src/` subtree.
 *
 * @param {import('typescript').SourceFile} sourceFile
 * @param {string} anchorDir
 * @param {Set<string>} visitedSet
 * @returns {{ values: Set<string>, types: Set<string> }}
 */
function collectForbiddenNames(sourceFile, anchorDir, visitedSet) {
  /** @type {Set<string>} */
  const values = new Set();
  /** @type {Set<string>} */
  const types = new Set();

  // Sort `export *` sources so the walk order is deterministic across runs.
  /** @type {string[]} */
  const exportStarSources = [];

  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      const isTypeOnly = statement.isTypeOnly === true;
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const specifier of statement.exportClause.elements) {
          const exportedName = specifier.name.text;
          if (isTypeOnly || specifier.isTypeOnly === true) {
            types.add(exportedName);
          } else {
            values.add(exportedName);
          }
        }
      } else if (!statement.exportClause && statement.moduleSpecifier) {
        // `export * from '...'` form.
        if (ts.isStringLiteral(statement.moduleSpecifier)) {
          exportStarSources.push(statement.moduleSpecifier.text);
        }
      }
    } else if (
      ts.isVariableStatement(statement) &&
      statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          values.add(declaration.name.text);
        }
      }
    } else if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
      statement.name
    ) {
      values.add(statement.name.text);
    } else if (
      (ts.isTypeAliasDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement)) &&
      statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      types.add(statement.name.text);
    }
  }

  exportStarSources.sort();

  for (const specifier of exportStarSources) {
    if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
      // Bare or absolute specifier — not our package's source tree.
      continue;
    }
    const resolved = resolveRelativeSpecifier(specifier, anchorDir);
    if (resolved === null) {
      continue;
    }
    if (visitedSet.has(resolved)) {
      continue;
    }
    visitedSet.add(resolved);
    const childSource = parseIndexTs(resolved);
    const nested = collectForbiddenNames(
      childSource,
      path.dirname(resolved),
      visitedSet,
    );
    for (const name of nested.values) {
      values.add(name);
    }
    for (const name of nested.types) {
      types.add(name);
    }
  }

  return { values, types };
}

/**
 * Emit the seven `no-restricted-syntax` selector entries per forbidden name.
 *
 * @param {{ values: Set<string>, types: Set<string>, packageName: string }} args
 * @returns {RestrictedSyntaxEntry[]}
 */
function generateRules({ values, types, packageName }) {
  const names = new Set([...values, ...types]);
  /** @type {RestrictedSyntaxEntry[]} */
  const entries = [];
  for (const name of names) {
    const message =
      `'${name}' is exported by '${packageName}'. ` +
      `Do not redeclare it under apps/*. ` +
      `Replace this declaration with: import { ${name} } from '${packageName}';`;
    entries.push(
      {
        selector: `ExportNamedDeclaration > FunctionDeclaration[id.name='${name}']`,
        message,
      },
      {
        selector: `ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name='${name}']`,
        message,
      },
      {
        selector: `ExportNamedDeclaration > ClassDeclaration[id.name='${name}']`,
        message,
      },
      {
        selector: `ExportNamedDeclaration > TSTypeAliasDeclaration[id.name='${name}']`,
        message,
      },
      {
        selector: `ExportNamedDeclaration > TSInterfaceDeclaration[id.name='${name}']`,
        message,
      },
      {
        selector: `ExportNamedDeclaration > TSEnumDeclaration[id.name='${name}']`,
        message,
      },
      {
        selector: `ExportDefaultDeclaration > FunctionDeclaration[id.name='${name}']`,
        message,
      },
    );
  }

  entries.sort((a, b) => {
    if (a.selector !== b.selector) {
      return a.selector < b.selector ? -1 : 1;
    }
    if (a.message !== b.message) {
      return a.message < b.message ? -1 : 1;
    }
    return 0;
  });

  return entries;
}

/**
 * @param {DriftRuleFactoryInput} input
 * @returns {{ rules: RestrictedSyntaxEntry[] }}
 */
function createDriftRules(input) {
  if (
    typeof input?.packageName !== 'string' ||
    !input.packageName.startsWith('@debrief/')
  ) {
    throw new Error(
      `drift-rule-factory: packageName must be a string starting with '@debrief/' (got ${JSON.stringify(input?.packageName)})`,
    );
  }
  if (typeof input.indexPath !== 'string' || input.indexPath.length === 0) {
    throw new Error(
      `drift-rule-factory: indexPath must be a non-empty string`,
    );
  }
  const resolvedIndexPath = path.resolve(input.indexPath);
  const anchorDir =
    typeof input.anchorDir === 'string' && input.anchorDir.length > 0
      ? path.resolve(input.anchorDir)
      : path.dirname(resolvedIndexPath);

  const sourceFile = parseIndexTs(resolvedIndexPath);
  const visitedSet = new Set([resolvedIndexPath]);
  const { values, types } = collectForbiddenNames(
    sourceFile,
    anchorDir,
    visitedSet,
  );

  if (values.size === 0 && types.size === 0) {
    process.stderr.write(
      `drift-rule-factory: '${input.packageName}' has no exports — forbidden set is empty (index: ${resolvedIndexPath})\n`,
    );
    return { rules: [] };
  }

  const rules = generateRules({
    values,
    types,
    packageName: input.packageName,
  });

  return { rules };
}

module.exports = createDriftRules;
// Exposed for unit tests; not part of the public contract.
module.exports._internal = {
  parseIndexTs,
  collectForbiddenNames,
  generateRules,
  resolveRelativeSpecifier,
};

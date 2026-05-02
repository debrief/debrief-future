// @ts-check
/**
 * Article IV.4 enforcement — "the writer abstraction is the persistence boundary".
 *
 * Two checks:
 *
 *   1. no-restricted-imports — `node:fs` and `fs` imports are forbidden under
 *      `apps/web-shell/**`. Catches the obvious "developer accidentally
 *      imports Node fs into browser code" failure mode.
 *
 *   2. no-restricted-globals — `indexedDB`, `localStorage`, `sessionStorage`,
 *      and `caches` are forbidden everywhere except the explicit host-adaptor
 *      files: `apps/web-shell/src/services/stacWriterIdb.ts` and
 *      `apps/web-shell/src/services/stacWriterCapability.ts`.
 *
 * The capability probe legitimately needs `globalThis.indexedDB` for feature
 * detection; everywhere else routes through the StacWriter interface.
 *
 * To extend (e.g. add a new browser-native store the rule should police), add
 * the global to FORBIDDEN_BROWSER_PERSISTENCE_GLOBALS. To exempt a new
 * adaptor file, list it in HOST_ADAPTOR_ALLOW_LIST and configure an override
 * in the consumer's eslintrc.
 *
 * See research.md R-009 and CONSTITUTION.md Article IV.4 for the rationale.
 */

const FORBIDDEN_BROWSER_PERSISTENCE_GLOBALS = [
  {
    name: 'indexedDB',
    message:
      'Direct `indexedDB` access is forbidden outside the host adaptor. Route through `@debrief/stac-writer` (CONSTITUTION Article IV.4).',
  },
  {
    name: 'localStorage',
    message:
      'Direct `localStorage` access is forbidden in frontend code. Route persistence through the StacWriter interface (Article IV.4).',
  },
  {
    name: 'sessionStorage',
    message:
      'Direct `sessionStorage` access is forbidden in frontend code. Route persistence through the StacWriter interface (Article IV.4).',
  },
  {
    name: 'caches',
    message:
      'Direct Cache API access is forbidden in frontend code. Route persistence through the StacWriter interface (Article IV.4).',
  },
];

const FORBIDDEN_NODE_FS_IMPORTS = [
  {
    name: 'fs',
    message:
      'Node `fs` is not available in the browser. Route persistence through `@debrief/stac-writer` (CONSTITUTION Article IV.4).',
  },
  {
    name: 'node:fs',
    message:
      'Node `node:fs` is not available in the browser. Route persistence through `@debrief/stac-writer` (CONSTITUTION Article IV.4).',
  },
  {
    name: 'fs/promises',
    message:
      'Node `fs/promises` is not available in the browser. Route persistence through `@debrief/stac-writer` (CONSTITUTION Article IV.4).',
  },
  {
    name: 'node:fs/promises',
    message:
      'Node `node:fs/promises` is not available in the browser. Route persistence through `@debrief/stac-writer` (CONSTITUTION Article IV.4).',
  },
];

/** Files allowed to read browser persistence globals directly (capability probe + IDB adaptor). */
const HOST_ADAPTOR_ALLOW_LIST = [
  'apps/web-shell/src/services/stacWriterIdb.ts',
  'apps/web-shell/src/services/stacWriterCapability.ts',
];

module.exports = {
  FORBIDDEN_BROWSER_PERSISTENCE_GLOBALS,
  FORBIDDEN_NODE_FS_IMPORTS,
  HOST_ADAPTOR_ALLOW_LIST,
};

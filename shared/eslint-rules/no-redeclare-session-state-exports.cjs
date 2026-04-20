// @ts-check
/**
 * Caller module — invokes the drift-rule factory for `@debrief/session-state`.
 * See specs/214-utils-drift-guard/contracts/rule-contract.md §1.1.
 */
const path = require('path');
const createDriftRules = require('./drift-rule-factory.cjs');

module.exports = createDriftRules({
  packageName: '@debrief/session-state',
  indexPath: path.resolve(
    __dirname,
    '../../services/session-state/src/index.ts',
  ),
});

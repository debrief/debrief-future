// @ts-check
/**
 * Caller module — invokes the drift-rule factory for `@debrief/data`.
 * See specs/214-utils-drift-guard/contracts/rule-contract.md §1.1.
 */
const path = require('path');
const createDriftRules = require('./drift-rule-factory.cjs');

module.exports = createDriftRules({
  packageName: '@debrief/data',
  indexPath: path.resolve(__dirname, '../data/src/ts/index.ts'),
});

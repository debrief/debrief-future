// @ts-check
/**
 * Caller module — invokes the drift-rule factory for `@debrief/components`.
 * See specs/214-utils-drift-guard/contracts/rule-contract.md §1.1.
 */
const path = require('path');
const createDriftRules = require('./drift-rule-factory.cjs');

module.exports = createDriftRules({
  packageName: '@debrief/components',
  indexPath: path.resolve(__dirname, '../components/src/index.ts'),
});

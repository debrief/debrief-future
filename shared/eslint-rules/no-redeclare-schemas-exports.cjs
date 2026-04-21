// @ts-check
/**
 * Caller module — invokes the drift-rule factory for `@debrief/schemas`.
 * See specs/214-utils-drift-guard/contracts/rule-contract.md §1.1.
 */
const path = require('path');
const createDriftRules = require('./drift-rule-factory.cjs');

module.exports = createDriftRules({
  packageName: '@debrief/schemas',
  indexPath: path.resolve(
    __dirname,
    '../schemas/src/generated/typescript/index.ts',
  ),
});

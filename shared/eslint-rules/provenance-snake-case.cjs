/**
 * ESLint no-restricted-syntax rules enforcing snake_case for provenance fields.
 *
 * ADR-010: All JSON written to disk or sent over IPC uses snake_case keys,
 * matching the STAC specification and the LinkML-generated schema.
 *
 * These rules prevent handwritten TypeScript from using camelCase property
 * names for provenance-related types (LogEntry, WasGeneratedBy, etc.).
 * The generated types at @debrief/schemas use snake_case; consumer code
 * must match.
 */

const CAMEL_TO_SNAKE = {
  activityId: 'activity_id',
  wasGeneratedBy: 'was_generated_by',
  executionDuration: 'execution_duration',
  generatedResultId: 'generated_result_id',
  inputState: 'input_state',
  toolVersion: 'tool_version',
  previousValue: 'previous_value',
  newValue: 'new_value',
  featureId: 'feature_id',
};

/** Generate no-restricted-syntax entries for each camelCase → snake_case pair. */
const rules = Object.entries(CAMEL_TO_SNAKE).flatMap(([camel, snake]) => [
  {
    // Property access: obj.activityId (not computed obj[activityId])
    selector: `MemberExpression[computed=false][property.name='${camel}']`,
    message: `Use '${snake}' instead of '${camel}' (ADR-010: snake_case wire format).`,
  },
  {
    // Object literal key: { activityId: ... }
    selector: `Property[key.name='${camel}']`,
    message: `Use '${snake}' instead of '${camel}' (ADR-010: snake_case wire format).`,
  },
  {
    // Interface/type property declaration: activityId: string
    selector: `TSPropertySignature[key.name='${camel}']`,
    message: `Use '${snake}' instead of '${camel}' (ADR-010: snake_case wire format).`,
  },
]);

module.exports = { rules };

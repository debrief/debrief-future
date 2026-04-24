/**
 * Typed error thrown by `resolvePositionStyle` when a runtime `override.symbol`
 * value is not a permissible point shape (i.e., not a member of
 * `PointShapeEnum`). Carries the offending value and the list of permissible
 * shapes so renderers and log surfaces can report the mismatch precisely.
 */
export class InvalidPointShapeError extends Error {
  readonly offendingValue: string;
  readonly validShapes: readonly string[];

  constructor(offendingValue: string, validShapes: readonly string[]) {
    super(
      `Invalid point shape: ${JSON.stringify(offendingValue)}. ` +
        `Valid shapes: ${validShapes.map((s) => JSON.stringify(s)).join(', ')}.`
    );
    this.name = 'InvalidPointShapeError';
    this.offendingValue = offendingValue;
    this.validShapes = validShapes;
  }
}

/**
 * Pure axe-violation categoriser (Feature 234, US3 — research R12, T4A).
 *
 * Maps axe severity to action: serious + critical → fail, moderate → warn,
 * minor → ignore. The Playwright a11y spec invokes this to keep its own
 * pass/fail decision side-effect free; a moderate `warn` row is written to
 * the markdown report via an injectable writer (so the categoriser stays
 * pure and unit-testable without filesystem access).
 *
 * Why pure + injectable writer: the categorisation decision IS a code
 * path. Without a unit test, a refactor could silently turn moderate
 * warns into ignores and quietly suppress accessibility-regression
 * visibility. See research.md R12 for the full rationale.
 */

/**
 * Structural subset of `axe-core`'s Result/Violation shape — the
 * categoriser only consults the `impact` field, so we type the input
 * loosely to avoid pinning the helper to a specific axe-core version.
 * The Playwright spec passes `AxeResults['violations']` straight through.
 */
export interface AxeViolationLike {
  /** axe severity. Categoriser routes on this field exclusively. */
  readonly impact?: 'minor' | 'moderate' | 'serious' | 'critical' | null;
  /** Other fields preserved for downstream report rendering. */
  readonly id?: string;
  readonly description?: string;
  readonly help?: string;
  readonly helpUrl?: string;
  readonly nodes?: readonly unknown[];
}

export interface CategorisedViolations<V extends AxeViolationLike = AxeViolationLike> {
  /** serious + critical → must fail the test (FR-022). */
  readonly fail: readonly V[];
  /** moderate → warn + write a row to the accepted-risk report (FR-022, FR-023). */
  readonly warn: readonly V[];
  /** minor → noise filter; not enumerated in the report. */
  readonly ignore: readonly V[];
}

/**
 * Pure partition: serious/critical → fail, moderate → warn, minor → ignore.
 * Unknown / null impact also goes to `ignore` so axe rule changes that
 * introduce a new severity don't accidentally fail the suite.
 */
export function categoriseAxeViolations<V extends AxeViolationLike>(
  violations: readonly V[],
): CategorisedViolations<V> {
  const fail: V[] = [];
  const warn: V[] = [];
  const ignore: V[] = [];
  for (const v of violations) {
    switch (v.impact) {
      case 'serious':
      case 'critical':
        fail.push(v);
        break;
      case 'moderate':
        warn.push(v);
        break;
      case 'minor':
      default:
        ignore.push(v);
        break;
    }
  }
  return { fail, warn, ignore };
}

/**
 * Side-effect helper used by the spec to record warn-level findings to
 * the accepted-risk report. Injectable for unit tests.
 */
export interface ReportRowWriter {
  (row: ReportRow): void;
}

export interface ReportRow {
  readonly surface: string;
  readonly theme: string;
  readonly ruleId: string;
  readonly impact: 'moderate';
  readonly help: string;
  readonly helpUrl: string;
}

/**
 * Convenience: writes a row per moderate violation via the supplied
 * writer. Used by the Playwright spec; unit-testable via a stub writer.
 */
export function writeWarnRows<V extends AxeViolationLike>(
  context: { readonly surface: string; readonly theme: string },
  warns: readonly V[],
  writer: ReportRowWriter,
): void {
  for (const v of warns) {
    writer({
      surface: context.surface,
      theme: context.theme,
      ruleId: v.id ?? '<unknown>',
      impact: 'moderate',
      help: v.help ?? '',
      helpUrl: v.helpUrl ?? '',
    });
  }
}

/**
 * Structured load error for the SystemState helper (feature 261, FR-011/FR-012).
 *
 * Strict-on-import (Article XIV.4): malformed, duplicate, or cross-field-invalid
 * SystemState features fail load loudly with the offending feature id(s) — never
 * a tolerant fallback. The absence of a variant is NOT an error (FR-008) and does
 * not raise this.
 */
export type SystemStateLoadErrorKind =
  | 'multiple-features-with-same-state-type'
  | 'malformed-feature'
  | 'unknown-state-type'
  | 'missing-discriminator'
  | 'cross-field-invariant';

export class SystemStateLoadError extends Error {
  readonly kind: SystemStateLoadErrorKind;
  readonly featureIds: string[];
  readonly details?: unknown;

  constructor(opts: {
    kind: SystemStateLoadErrorKind;
    featureIds: string[];
    details?: unknown;
    message: string;
  }) {
    super(opts.message);
    this.name = 'SystemStateLoadError';
    this.kind = opts.kind;
    this.featureIds = opts.featureIds;
    this.details = opts.details;
    // Restore the prototype chain (TS-down-to-ES5 target safety).
    Object.setPrototypeOf(this, SystemStateLoadError.prototype);
  }
}

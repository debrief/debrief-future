/**
 * Diff-style contract for #198 — `LiveOutcome` union extension.
 *
 * This file documents the EXACT change made to the `LiveOutcome` union in
 * `shared/components/src/nl-cql2/types.ts`. It is a documentation artefact;
 * the real type lives in the source module above. If the two ever drift,
 * the structural-match assertion in
 * `shared/components/src/nl-cql2/__tests__/clients.test.ts` (mirrored from
 * #191's existing pattern for `NlLiveOutcome`) will surface the drift.
 *
 * Contract scope:
 *   - One new union variant: `LiveKeyringUnavailable`.
 *   - No existing variant is renamed, removed, or has its shape changed.
 *   - The `kind` discriminator is the new literal string `"keyring-unavailable"`.
 *   - The variant carries `durationMs: 0` (consistent with `LiveNotConfigured`
 *     and `LiveCeilingReached`, both of which are zero-cost host-side
 *     short-circuits).
 *   - Optional `platformHint` (non-sensitive) drives banner copy selection;
 *     the discriminator itself is independent of platform (Decision 3).
 *
 * NOTE: this file is type-only documentation. It is not imported anywhere in
 * the runtime build graph; it exists for spec reviewers and for future
 * archaeology.
 */

// -----------------------------------------------------------------------------
// BEFORE (#191) — reference shape, do not edit
// -----------------------------------------------------------------------------

// type LiveOutcome_BEFORE =
//   | LiveSuccess
//   | LiveAuthFailure
//   | LiveRateLimit
//   | LiveProviderError
//   | LiveTransportError
//   | LiveTimeout
//   | LiveMalformedResponse
//   | LiveNotConfigured
//   | LiveCeilingReached;

// -----------------------------------------------------------------------------
// AFTER (#198) — the single new variant
// -----------------------------------------------------------------------------

/**
 * The OS credential keyring rejected (or threw on) the secret read.
 *
 * Detection rule: `await context.secrets.get(...)` rejected for ANY reason.
 * No error-shape inspection — see Decision 1 (`research.md`).
 */
export interface LiveKeyringUnavailable_Contract {
  readonly kind: "keyring-unavailable";
  /**
   * Optional non-sensitive platform hint. Drives the secondary hint
   * sentence in the banner; the headline copy remains OS-neutral
   * regardless of value (FR-010, Decision 3).
   *
   * Selection rule (`detectPlatformHint()` in `apps/vscode/src/services/
   * llmProxy.ts`):
   *   - `process.platform === 'linux'`  → `"linux"`
   *   - `process.platform === 'darwin'` → `"macos"`
   *   - `process.platform === 'win32'`  → `"windows"`
   *   - otherwise                       → `"unknown"` (no hint paragraph)
   */
  readonly platformHint?: "linux" | "macos" | "windows" | "unknown";
  /**
   * Always 0 — the failure is detected before the network call begins, so
   * the elapsed wall-clock is meaningless. Matches `LiveNotConfigured`
   * and `LiveCeilingReached` precedent.
   */
  readonly durationMs: 0;
}

// -----------------------------------------------------------------------------
// Backwards compatibility notes
// -----------------------------------------------------------------------------
//
//   * Adding a new literal to the discriminated union is structurally
//     additive. Consumers that use a bare `switch (outcome.kind)` with no
//     `default` clause will see a TypeScript exhaustiveness error until
//     they add a `case "keyring-unavailable":` branch — this is the
//     desired behaviour (`plan.md` Constitution Check, Article XV).
//
//   * Consumers that use a `default` clause will continue to compile and
//     will treat the new outcome as the default banner case. This is
//     acceptable for non-`FilterBar` consumers (e.g. the audit-log writer
//     introduced by #197) because the discriminator string itself is the
//     persistable artefact.
//
//   * `TransportCallRecord.outcome` is typed as `LiveOutcome["kind"]`,
//     which automatically gains the `"keyring-unavailable"` literal — no
//     telemetry schema migration is required (FR-009, plan §Phase 6).

/**
 * Exhaustiveness helper for TypeScript `switch` / discriminated-union checks.
 *
 * Used as the default branch of every exhaustive switch on a finite union so
 * that adding a new member to the union turns "unhandled case" into a
 * compile-time error. At runtime — which should be unreachable if the
 * compiler is happy — it throws with the offending value for diagnostics.
 */
export function assertNever(value: never): never {
  throw new Error(
    `assertNever: unreachable value encountered — ${String(value)}`
  );
}

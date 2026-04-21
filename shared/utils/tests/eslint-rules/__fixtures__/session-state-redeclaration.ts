// Positive fixture — redeclares a name reached via `export *` forwarding in
// services/session-state/src/index.ts → types/index.ts → features.ts. Proves
// the transitive walker contributes names to the @debrief/session-state rule.
export function getSessionStore(): null {
  return null;
}

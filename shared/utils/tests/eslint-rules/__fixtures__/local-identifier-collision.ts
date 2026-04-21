// Negative fixture: non-exported local identifier that happens to collide.
// Redeclaring a name for internal use without exporting it is fine — the
// drift guard is about the export surface, not internal helpers.
function calculateBounds(): number[] {
  return [0, 0, 0, 0];
}

export function runLocal(): number[] {
  return calculateBounds();
}

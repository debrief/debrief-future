// Fixture: alias that bottoms out in Record<string, unknown> —
// should auto-tag as boundary-candidate.
export type LooseBag = Record<string, unknown>;

// Fixture: alias that bottoms out in unknown.
export type AnythingGoes = unknown;

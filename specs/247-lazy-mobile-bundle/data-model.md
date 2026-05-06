# Phase 1 Data Model: Lazy-load Backlog Navigator mobile component tree

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

This feature is a build-time / runtime-UX optimisation. It does not introduce
or modify any persistent data model. There are, however, two **build-time
artefacts** whose shape is contractual for the bundle-size guard, plus one
**runtime data shape** for the chunk-error boundary. Each is documented below
so the implementation has a precise target.

---

## Entity 1 — Vite build manifest entry

**File**: `apps/backlog-navigator/dist/.vite/manifest.json`
**Generator**: Vite (when `build.manifest = true` is set in `vite.config.ts`)
**Consumer**: `scripts/check-bundle-size.mjs`

Vite emits a JSON object keyed by source path. Each value describes one
emitted chunk. The shape relevant to this feature:

```typescript
interface ViteManifestEntry {
  /** The emitted chunk filename, relative to dist/. e.g. "assets/index-AbCdEf.js" */
  readonly file: string;
  /** Original source path. e.g. "src/main.tsx" */
  readonly src?: string;
  /** True for the application's entry point (the main.tsx invocation). */
  readonly isEntry?: boolean;
  /** True for chunks reached only via dynamic import — i.e. lazy chunks. */
  readonly isDynamicEntry?: boolean;
  /** Synchronous imports of this chunk. Manifest keys, not file paths. */
  readonly imports?: readonly string[];
  /** Dynamic imports of this chunk. Manifest keys, not file paths. */
  readonly dynamicImports?: readonly string[];
  readonly css?: readonly string[];
  readonly assets?: readonly string[];
}

type ViteManifest = Readonly<Record<string, ViteManifestEntry>>;
```

### Validation rules

- The manifest **MUST** contain exactly one entry with `isEntry: true`. The
  Backlog Navigator has a single `src/main.tsx` entrypoint; multiple entries
  would indicate a build misconfiguration and the guard exits with code 2
  (configuration error) rather than 1 (budget overrun).
- The entry chunk's `file` field **MUST** resolve to an existing path under
  `apps/backlog-navigator/dist/`. Otherwise the guard exits with code 2.
- `dynamicImports` on the entry **SHOULD** include the mobile chunk after
  this feature lands. The guard logs the count for visibility but does not
  assert on it (asserting would couple the guard to the specific number of
  dynamic imports, which would change every time a new lazy boundary lands).

### Lifecycle

The manifest is regenerated on every `vite build` and is **not** committed to
the repository. It is read by `check-bundle-size.mjs` immediately after the
build step in CI and locally.

---

## Entity 2 — Bundle baseline file (modified)

**File**: `scripts/bundle-baseline-244.json` (existing — schema unchanged, values updated)
**Generator**: Manually committed; updated when a re-baseline is justified
**Consumer**: `scripts/check-bundle-size.mjs`

The existing schema is preserved verbatim. Only the values change after this
feature lands.

```typescript
interface BundleBaseline {
  /** Stable identifier — feature spec or significant change that captured this baseline. */
  readonly feature: string;
  /** The gzipped byte count of the budgeted asset. After #247: the desktop entry chunk only. */
  readonly baseline_bytes: number;
  /** Map of measured file → gzipped bytes at the time of capture. */
  readonly baseline_files: Readonly<Record<string, number>>;
  /** Commit SHA that produced the baseline. */
  readonly commit_sha: string;
  /** ISO 8601 timestamp. */
  readonly captured_at: string;
  /** Allowance percentage (informational). */
  readonly target_pct: number;
  /** Hard cap percentage (informational). */
  readonly cap_pct: number;
  /** The percentage actually enforced by the guard. */
  readonly current_budget_pct: number;
  /** Free-text notes including the rationale for the current values. */
  readonly notes: string;
}
```

### Validation rules

- `baseline_bytes` **MUST** match the sum of `Object.values(baseline_files)`
  (sanity check; current script does not enforce, but the new test does).
- `baseline_files` **MUST** be a single-key map after #247 — keyed by the
  desktop entry chunk path, not the previous "all JS" sum.
- `current_budget_pct` is unchanged from #244 (15% by default; 30% cap).

### Re-baseline trigger for this feature

The implementation tasks include a step that:

1. Builds the navigator with the new lazy boundary in place.
2. Reads the entry chunk's gzipped size.
3. Replaces `baseline_bytes`, `baseline_files`, `commit_sha`, `captured_at`,
   and updates `notes` with a short rationale referencing #247.

The pre-#247 number (121576 = sum of all JS) is replaced by the post-#247
number (entry chunk only). The reduction is the SC-001 evidence.

---

## Entity 3 — Chunk-error boundary state (runtime)

**Module**: `apps/backlog-navigator/src/components/lazy/ChunkErrorBoundary.tsx`
**Lifetime**: One instance per `<Suspense>` boundary; resets on full page reload

```typescript
interface ChunkErrorBoundaryProps {
  readonly children: React.ReactNode;
  /** Optional override for the recovery message. Defaults to strings.lazy.chunkErrorMessage. */
  readonly fallbackMessage?: string;
}

interface ChunkErrorBoundaryState {
  /** Whether the boundary has caught a chunk-load error. */
  readonly hasChunkError: boolean;
  /** The caught error, retained for diagnostic logging. */
  readonly error: Error | null;
}

/** Predicate used inside getDerivedStateFromError. */
function isChunkLoadError(error: unknown): boolean;
```

### State transitions

1. **Mounted (no error)** — `hasChunkError = false`, `error = null`.
   `children` is rendered normally; `Suspense` may show its skeleton fallback
   while a lazy chunk loads.
2. **Chunk-load error caught** — `getDerivedStateFromError` runs
   `isChunkLoadError(error)`:
   - **True** → `hasChunkError = true`, `error = caught`. The boundary renders
     the recovery panel (status banner + Reload button).
   - **False** → re-throws the error so it propagates to any outer boundary
     (none today; behaviour unchanged for non-chunk errors).
3. **User clicks Reload** — boundary calls `window.location.reload()`. The
   page reloads from a fresh entry chunk; the boundary instance is
   discarded.

### `isChunkLoadError` predicate

Returns true when:

- `error instanceof Error` AND
- (`error.name === 'ChunkLoadError'` OR
  `error.message` matches `/Loading chunk \w+ failed|Failed to fetch dynamically imported module|Importing a module script failed/`)

These cover the error shapes emitted by Vite's runtime, webpack-style chunks,
and Safari's slightly different wording.

---

## Notes

- No LinkML changes (Article II.1) — none of these entities is part of the
  domain schema.
- No persistence (Article IV.4) — the boundary state is React in-memory only.
- All shapes are typed end-to-end (Article XV) — `any` is not used; the
  `unknown` type appears once in the predicate, which narrows immediately.

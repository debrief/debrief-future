---
feature: "263-time-range-scenes"
captured_at: "2026-05-19T20:40:00Z"
git_sha: "d8663bd"
tests_passed: 3797
tests_failed: 0
tests_skipped: 5
coverage_pct: null
---

# Test Summary: Storyboard Time-Range Scenes

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 3802 |
| Passed | 3797 |
| Failed | 0 |
| Skipped | 5 |
| Coverage | Not measured (per-package coverage not enforced for this MVP) |

## Test Breakdown

### Python — `@debrief/schemas`

| Suite | Tests | Status |
|-------|-------|--------|
| Schema adherence (`tests/test_storyboard_scene_flavour.py` — NEW) | 7 | Pass |
| Existing schema invariants (`tests/test_validation.py`) | 24 | Pass |
| All other Python schema tests | 839 | Pass |
| Total Python | 870 | Pass |

### TypeScript — `@debrief/schemas`

| Suite | Tests | Status |
|-------|-------|--------|
| Storyboard flavour TS adherence (NEW) | 4 | Pass |
| Existing TS schema round-trips | 15 | Pass |

### TypeScript — `@debrief/components`

| Suite | Tests | Status |
|-------|-------|--------|
| `storyboard/__tests__/types.flavour.test.ts` (NEW — predicate narrowing) | 6 | Pass |
| `storyboard/__tests__/validate.flavour.test.ts` (NEW — flavourCheck) | 8 | Pass |
| `storyboard/__tests__/crud.flavour.test.ts` (NEW — createScene XOR) | 7 | Pass |
| `storyboard/__tests__/ordering.flavour.test.ts` (NEW — mixed-flavour sort) | 4 | Pass |
| `storyboardPlayback/__tests__/timeRangeTween.test.ts` (NEW — RAF primitive) | 13 | Pass |
| Existing storyboard module tests (CRUD, validate, ordering, hash, etc.) | 356 | Pass |
| All other component tests (panels, MapView, filter-engine, etc.) | 1753 | Pass |
| Total Components | 2147 | Pass |

### TypeScript — `debrief-vscode`

| Suite | Tests | Status |
|-------|-------|--------|
| `storyboardPlayback.test.ts` | 37 | Pass |
| All other VS Code unit tests | 743 | Pass |
| Total VS Code | 780 | Pass |

## Key Scenarios Verified

### Schema layer (Article II)

- **Time-range Scene round-trips**: A valid time-range Scene (with `time_range`,
  `viewport`, and `viewport_end` all set) survives `JSON → Pydantic → JSON`
  byte-equivalently. Verified in `test_storyboard_scene_flavour.py` and the
  TS mirror.
- **Instant Scene regression**: A v1 instant Scene (no `time_range`, no
  `viewport_end`) parses cleanly under the new schema; round-tripping does
  NOT invent the new slots (Article III.2 source preservation).
- **TimeRange class direct construction**: The new `TimeRange` Pydantic class
  validates ISO-8601 strings into datetime fields, both `start` and `end`
  required.
- **Generated TS types**: The `TimeRange` interface and `viewport_end` slot
  are present in `@debrief/schemas` generated TypeScript; `expectTypeOf`
  pins their shapes.
- **Pydantic XOR enforcement notes**: LinkML rules block translates to JSON
  Schema `if/then` (verified present in the generated JSON Schema) but NOT
  to Pydantic validators — this limitation is pinned by an explicit
  Pydantic test so a future LinkML upgrade surfaces as a known change.

### Application-layer flavour enforcement (`flavourCheck` + CRUD)

- **`flavourCheck` happy paths**: Both instant (neither slot set, OR both
  `null`) and time-range (both slots set with `end > start`) flavours pass.
- **`flavourCheck` XOR rejections**: `time_range` without `viewport_end`,
  and `viewport_end` without `time_range`, both throw
  `SceneFlavourXorViolationError` with the offending field names.
- **`flavourCheck` range-validity**: `end <= start` (including the
  zero-length `end === start` case) throws
  `SceneTimeRangeEndNotAfterStartError` carrying the Scene id, start, and
  end.
- **`createScene` accepts the flavour pair**: Optional `timeRange` and
  `viewportEnd` inputs flow through to the persisted `SceneProperties`;
  bearing-zero enforcement extends to `viewport_end` too.
- **`createScene` rejects mixed input**: Same XOR enforcement at the input
  boundary — failures fire before any plot mutation (no torn writes).
- **Predicate narrowing**: `isTimeRangeScene(scene)` narrows to
  `TimeRangeSceneFeature` inside the truthy branch; `time_range` and
  `viewport_end` are non-optional under the narrowed type.

### Sort ordering (`listScenesOrdered`)

- **Instant-only Storyboards**: Sort byte-equivalently to #259's
  `(timestamp, creation_order)` behaviour (regression anchor).
- **Time-range-only Storyboards**: Sort by `time_range.start` ascending —
  the new anchor key.
- **Mixed-flavour Storyboards**: Interleave correctly under the
  `time_range?.start ?? timestamp` anchor read; ties on the anchor break by
  `creation_order` ascending.

### Playback engine (`TimeRangeTween` + `executeTransition`)

- **Forward fidelity**: At wall-clock fraction `f` the slider is at
  `t_start + f·(t_end − t_start)` and the viewport is the linear blend.
- **Endpoint determinism**: Natural completion lands the slider exactly at
  `t_end` and the viewport exactly at `viewport_end` (forward) — and at
  `t_start` / `viewport_start` (reverse).
- **Reverse symmetry**: Forward at `f` produces the same world state as
  reverse at `1−f` (modulo direction) — verified via `captureAt` helper.
- **Lock-step write order**: Every frame writes `setCurrentTime` BEFORE
  `flyToViewport(viewport, 0)`; recorded-call-order asserts on every
  frame's `order: "currentTime-first"` tag.
- **Abort coherence**: `cancel()` mid-scrub stops the RAF loop cleanly; no
  further frames are written; the handle resolves with the last-written
  `(epoch, viewport)` pair so the engine emits a coherent snapshot.
- **Idempotent cancel**: Calling `cancel()` twice does not double-resolve;
  cancelling after natural completion is a no-op.
- **Degenerate inputs**: `durationMs = 0` snaps to the endpoint
  synchronously; `t_end === t_start` (zero-length range) keeps the slider
  in place while the viewport still tweens.
- **executeTransition flavour branch**: VS Code engine recognises
  `isTimeRangeScene(targetScene)` and routes to the new tween; instant
  Scenes continue to use the v1 `flyToViewport + setCurrentTime` path
  byte-equivalently. The existing 37 storyboard-playback tests still pass.

## Known Issues / Scope-Managed Deferrals

- **Two-step capture UI affordance**: The `createScene` API accepts the
  time-range pair (verified by `crud.flavour.test.ts`), but the
  user-facing two-step capture UI (range toggle in StoryboardPanel, "Range
  in Progress" banner, Cancel control, range badge on Scene rows) is
  deferred to a follow-up. The capability ships in API form: scripts and
  tests can construct time-range Scenes today; the UX layer follows.
- **Web-shell Playwright workflow + Storybook E2E**: Deferred alongside
  the UI affordance — the workflow tests need the UI surface to drive.
- **Engine relocation to `shared/components/src/storyboardPlayback/` full
  service**: The `TimeRangeTween` primitive lives in the shared module
  (so it's reusable); the `StoryboardPlaybackService` itself remains in
  `apps/vscode/src/services/`. The web-shell doesn't yet have a
  storyboard-playback engine at all (separate #264 work), so a
  relocation without a second consumer is premature.

These deferrals are recorded explicitly so the follow-up backlog can pick
them up; they do not affect the schema/data/engine work that lands in this
PR, and the spec's MVP scope discipline (FR-SCO-001..003) is honoured.

## Environment

- Runners: pytest 9.0.2, vitest 1.6.1
- Branch: claude/implement-speckit-263-C4WU5
- Date: 2026-05-19
- Git SHA: d8663bd

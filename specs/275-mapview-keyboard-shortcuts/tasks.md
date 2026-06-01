# Tasks: First-class keyboard-shortcut convention for MapView

**Feature**: `275-mapview-keyboard-shortcuts` (backlog #261) · **Branch**: `claude/quirky-lovelace-e3rv9`
**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Inputs**: research.md, data-model.md, contracts/, quickstart.md

This is a developer-facing **library** feature (a React hook + provider in `@debrief/components`) plus a governance **ADR** — no UI screen, no schema, no service, no new dependency. Tests are Vitest + @testing-library/react (jsdom). The `L` migration must keep #260's regression suite green.

## Evidence Requirements

**Evidence Directory**: `specs/275-mapview-keyboard-shortcuts/evidence/`
**Media Directory**: `specs/275-mapview-keyboard-shortcuts/media/`

### Feature type → evidence

This is a **Library/SDK** feature (a hook + provider). Per the quality rubric: code examples with results, plus the required test summary and usage demonstration. **No screenshots / interaction GIF / Playwright** — there is no new visual surface (the only user-visible behaviour, the `L` lock toggle, is #260's and is unchanged). The plan's Storybook and Web-Shell E2E sections are both *None* for this reason.

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Vitest results (new hook/provider suite + the unchanged #260 suite), via the test-summary template with YAML front matter | After all tests pass |
| `evidence/usage-example.md` | The "add a map shortcut in one call" demonstration + the before/after contrast vs #260's inline handler | After the hook is complete |
| `evidence/conflict-warning-demo.txt` | Captured dev `console.warn` output from a duplicate / Leaflet-reserved registration (proves FR-012) | After US3 conflict warns land |
| `evidence/opening-context.md` | Cached blog opener (Hook + What/How/Decisions) | ✅ already written during `/speckit.plan` |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/shipped-post.md` | Feature post: first three sections verbatim from `evidence/opening-context.md`, remaining sections from evidence; before/after Hook; **a "what's bound / what's reserved" shortcuts table** (live `L` + reserved candidates + Leaflet off-limits) drawn from the ADR-039 registry | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | Existing PR #659 updated with evidence (spec→plan→review→impl on one branch) | Final task |
| Blog PR | PR in debrief.github.io with the shipped post | Triggered by `/speckit.pr` |

## Phase 1: Setup (Shared Infrastructure)

**Goal**: Create the two source files as compiling stubs and wire the barrel exports, so foundation and tests have something to import. Everything here lands in the existing `@debrief/components` package — no new package, no new dependency.

- [ ] T001 [P] Scaffold the provider module — `createContext`, the public type names (`MapKeyboardShortcutOptions`, `MapKeyboardShortcutProviderProps`), and a placeholder `MapKeyboardShortcutProvider` that just renders `children` `shared/components/src/hooks/MapKeyboardShortcutProvider.tsx`
- [ ] T002 [P] Scaffold the hook — typed signature `useMapKeyboardShortcut(key: string, handler: (e: KeyboardEvent) => void, options?: MapKeyboardShortcutOptions): void` with a no-op body `shared/components/src/hooks/useMapKeyboardShortcut.ts`
- [ ] T003 Export `useMapKeyboardShortcut`, `MapKeyboardShortcutProvider`, `RESERVED_MAP_SHORTCUT_KEYS`, `LEAFLET_RESERVED_KEYS`, and the public types from the barrel (mirror the existing `// Hooks` block) `shared/components/src/index.ts`

**Checkpoint**: package compiles (`pnpm --filter @debrief/components typecheck`) with the new symbols exported.

## Phase 2: Foundational (Blocking Prerequisites)

**Goal**: Build the whole mechanism — the engine all three stories exercise. Tasks T004–T007 edit the **same** file (the provider module) so they run **sequentially**; T008 is the hook in a separate file. Implements data-model.md §1–§7 and the policy contract.

- [ ] T004 Implement `normalizeKey(key)` (lowercase single ASCII letters, raw otherwise — D3), the `MapKeyboardShortcutOptions` + `ShortcutEntry` types (with `ShortcutEntry.options` derived via `Required<Omit<…>> & Pick<…>` per ADR-033), and the default-resolution helper (the table in data-model §2) `shared/components/src/hooks/MapKeyboardShortcutProvider.tsx`
- [ ] T005 Implement the governance constants — `RESERVED_MAP_SHORTCUT_KEYS` (`{ l: 'viewport-lock (#260)' }`) and `LEAFLET_RESERVED_KEYS` (arrows, `+`, `=`, `-`, `_`, `escape` — D8) `shared/components/src/hooks/MapKeyboardShortcutProvider.tsx`
- [ ] T006 Implement the registry (`Map<NormalizedKey, ShortcutEntry>` in a ref) with `register`/`unregister`; `register` keeps the incumbent on a duplicate and emits a `console.warn` for duplicate **and** Leaflet-reserved keys, guarded by `process.env.NODE_ENV !== 'production'` (decision 3A — fires under vitest, silent in prod) `shared/components/src/hooks/MapKeyboardShortcutProvider.tsx`
- [ ] T007 Implement the single `keydown` listener with the evaluation order (normalize → lookup → `enabled` → `repeat`/`allowRepeat` → modifiers/`allowModifiers` → text-entry guard via `event.target instanceof HTMLElement` + `.closest(...)` (no `as` cast) → `preventDefault` → handler once), bound to the `container` element via an effect keyed on `[container]` (decision 1A — callback-ref capture; null container is a no-op until it resolves; cleanup on change/unmount) `shared/components/src/hooks/MapKeyboardShortcutProvider.tsx`
- [ ] T008 Implement `useMapKeyboardShortcut` — read context (throw a descriptive error if used outside a provider, C12), resolve defaults, hold the latest `handler` in a ref, and `register`/`unregister` in a `useEffect` so callers needn't memoize `shared/components/src/hooks/useMapKeyboardShortcut.ts`

**Checkpoint**: the mechanism compiles and is importable; no behaviour verified yet (that's the stories).

## Phase 3: User Story 1 — Add the next map shortcut without re-litigating the basics (Priority: P1)

**Goal**: Prove the mechanism gives a new shortcut correct-by-default behaviour from a single `useMapKeyboardShortcut(key, handler)` call.

**Independent test**: the convention suite (contracts C1–C9, C12, C13) is green — a throwaway shortcut (letter and non-letter) fires only on focus + no-modifier + not-typing, ignores auto-repeat by default, cleans up on unmount, and throws outside a provider — with no focus/modifier/Leaflet code at the call site.

### Tests for User Story 1

- [ ] T009 [test] Write the convention unit suite + a render harness (mount `MapKeyboardShortcutProvider` with a focusable container element + a component using the hook): C1 fires on key+focus+no-mod & calls `preventDefault`; C2 skips inside `<input>`; C3 skips with Ctrl/Meta/Alt/Shift; C4 skips when the container lacks focus; C5 non-letter `/`; C6 case-insensitive `l`/`L`; C7 unmount removes the binding; C8 auto-repeat off by default + on with `allowRepeat`; C9 `allowModifiers`; C12 throws outside a provider; C13 two distinct shortcuts each fire independently `shared/components/src/hooks/__tests__/useMapKeyboardShortcut.test.tsx`

### Implementation for User Story 1

- [ ] T010 [test] Run `pnpm --filter @debrief/components test useMapKeyboardShortcut` and bring C1–C9/C12/C13 green, fixing the foundation (T004–T008) as the tests demand (this is the TDD loop for the mechanism)

**Checkpoint**: US1 done — the hook is a usable, correct-by-default convention for any new map shortcut.

## Phase 4: User Story 2 — Preserve the existing `L` viewport-lock behaviour (Priority: P1)

**Goal**: Migrate the `L` shortcut onto the hook as the first adopter — behaviour-identical except the agreed auto-repeat fix (decision 2A).

**Independent test**: #260's `keyboardShortcut.test.tsx` (M1–M5) and `viewportLock.test.tsx` pass **unchanged**, plus a new case proving holding `L` toggles once.

### Tests for User Story 2

- [ ] T011 [test] Add the decision-2A regression case to the #260 L suite: dispatch a `keydown` for `l` with `repeat: true` and assert `onViewportLockChange` fires **once** (auto-repeat suppressed) `shared/components/src/MapView/__tests__/keyboardShortcut.test.tsx`

### Implementation for User Story 2

- [ ] T012 Migrate the `L` shortcut in MapView: capture the `.debrief-mapview` wrapper via a callback ref into state (`const [mapEl, setMapEl] = useState<HTMLElement | null>(null)`), wrap the subtree in `<MapKeyboardShortcutProvider container={mapEl}>`, add an internal null-rendering `<ViewportLockShortcut enabled={!!onViewportLockChange} locked={viewportLocked} onToggle={onViewportLockChange} />` that calls `useMapKeyboardShortcut('l', () => onToggle?.(!locked), { enabled, description: 'viewport-lock' })`, delete the inline `handleRootKeyDown`/`onKeyDown`, and narrow `event.target` via `instanceof HTMLElement` (drop the `as HTMLElement` cast at the old `MapView.tsx:987`) `shared/components/src/MapView/MapView.tsx`
- [ ] T013 [test] Run `pnpm --filter @debrief/components test keyboardShortcut viewportLock` and confirm M1–M5 + the lock regression pass unchanged, plus the new T011 case (the Leaflet snapshot/restore effect at the old `MapView.tsx:401-438` must remain untouched)

**Checkpoint**: US2 done — `L` runs through the convention with no observable change beyond the documented auto-repeat fix; #260 coverage intact.

## Phase 5: User Story 3 — Govern the convention with a documented decision (Priority: P2)

**Goal**: Make the convention discoverable and conflict-safe — the ADR registry plus the runtime warnings.

**Independent test**: ADR-039 exists and lists the reserved keys + policy + Leaflet-reserved keys + claim procedure; the conflict tests (C10, C11) assert the dev warnings fire.

### Tests for User Story 3

- [ ] T014 [test] Add conflict-surfacing tests: C10 — registering the same key twice on one provider keeps the incumbent and emits a `console.warn` (spy on `console.warn`); C11 — registering a `LEAFLET_RESERVED_KEYS` member (e.g. `arrowup`) emits a `console.warn`. Both rely on the decision-3A guard (`NODE_ENV !== 'production'`, which is `'test'` under vitest) `shared/components/src/hooks/__tests__/useMapKeyboardShortcut.test.tsx`
- [ ] T015 [test] Add a light governance assertion: `RESERVED_MAP_SHORTCUT_KEYS` contains `l` mapped to the viewport-lock owner (the full ADR-table ↔ constant drift guard is deferred to backlog #282) `shared/components/src/hooks/__tests__/useMapKeyboardShortcut.test.tsx`

### Implementation for User Story 3

- [ ] T016 [P] Author **ADR-039** in the decisions log: (a) reserved single-letter map keys table (initially `L` = viewport lock #260); (b) the default policy (focus-scoped, no-modifier, typing-safe, single-fire, auto-repeat off); (c) Leaflet-reserved keys that are off-limits (arrows, `+`/`=`, `-`/`_`, `Esc`); (d) the claim procedure (pick a non-reserved key → register via `useMapKeyboardShortcut` → add it to the ADR table in the same PR); (e) the known **TimeController divergence** note (out of scope, tracked as backlog #281) `docs/project_notes/decisions.md`

**Checkpoint**: US3 done — one authoritative record of reserved keys + policy, and conflicts are surfaced at dev time.

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Green gate, evidence, the feature post, and the PR.

### Quality Gate

- [ ] T017 [test] Run the full local gate `task verify` (ruff + ESLint, pyright + `tsc`, pytest + Vitest) and fix any failures before capturing evidence (TypeScript-only feature, but the gate runs the whole repo)

### Evidence Collection

- [ ] T018 Capture test results using the template (`.specify/templates/evidence/test-summary-template.md`) — YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed/failed/skipped`, `coverage_pct`) + the new hook/provider suite and the unchanged #260 suite `specs/275-mapview-keyboard-shortcuts/evidence/test-summary.md`
- [ ] T019 [P] Create the usage demonstration — "add a map shortcut in one call" + the before/after contrast against #260's ~40-line inline handler, with the resulting behaviour `specs/275-mapview-keyboard-shortcuts/evidence/usage-example.md`
- [ ] T020 [P] Capture the dev conflict-warning console output (a duplicate-key registration and a Leaflet-reserved-key registration) proving FR-012 `specs/275-mapview-keyboard-shortcuts/evidence/conflict-warning-demo.txt`

### Media Content

- [ ] T021 Create the feature blog post via the Content Specialist — first three sections (What We're Building / How It Fits / Key Decisions) copied **verbatim** from `evidence/opening-context.md`, the before/after table as the Hook, a **"What's bound, what's reserved" shortcuts table** (a *Live* `L` row + reserved candidate keys `/` `[` `]` + a Leaflet-off-limits sub-table for ↑↓←→ / `+` `-` / `Esc`, drawn from the ADR-039 registry so post and ADR can't drift; honest status column — only `L` is live; TimeController Space/arrows deliberately excluded as the #281 follow-up), "By the Numbers" from `test-summary.md`, plus Lessons Learned / What's Next `specs/275-mapview-keyboard-shortcuts/media/shipped-post.md`

### PR Creation

- [ ] T022 Create PR and publish blog: run `/speckit.pr` (updates the existing PR #659 with evidence and opens the debrief.github.io blog PR)

**Task T022 must run last** — it depends on every evidence and media task being complete. No Playwright/screenshot tasks: this is a non-visual library + ADR feature (see Evidence Requirements).

## Dependencies

### Phase dependencies

- **Setup (T001–T003)**: no dependencies — start immediately. T001/T002 are `[P]` (different files); T003 needs both.
- **Foundational (T004–T008)**: depends on Setup. T004→T005→T006→T007 are **sequential** (same file, `MapKeyboardShortcutProvider.tsx`). T008 (hook) depends on T004 (context/types) but not on T005–T007. **Blocks every user story.**
- **US1 (T009–T010)**: depends on Foundational. The convention suite hardens the mechanism.
- **US2 (T011–T013)**: depends on Foundational. Touches different files from US1 (`MapView.tsx`, `keyboardShortcut.test.tsx`), so it *can* run alongside US1 — but do US1 first so the mechanism is proven before the migration relies on it.
- **US3 (T014–T016)**: depends on Foundational (the conflict warns live in T006). T016 (ADR) is `[P]` — pure docs, writable any time after the design (now).
- **Polish (T017–T022)**: depends on all stories. T017 gate → T018–T020 evidence (T019/T020 `[P]`) → T021 post (needs T018 numbers) → **T022 PR last**.

### Story completion order

`Setup → Foundational → US1 (P1) → US2 (P1) → US3 (P2) → Polish`. The two P1 stories come first; US1 (the convention) before US2 (its first adopter).

### Independent test criteria

| Story | Independently testable by |
|-------|---------------------------|
| US1 | Convention suite green (C1–C9, C12, C13) — a throwaway shortcut behaves correctly with only key+handler supplied |
| US2 | #260 `keyboardShortcut.test.tsx` (M1–M5) + `viewportLock.test.tsx` pass unchanged, plus the new auto-repeat case |
| US3 | ADR-039 present with all four parts; conflict tests C10/C11 assert the dev warnings fire |

## Implementation Strategy

**MVP = Foundational + US1 + US2.** At that point the convention exists and is dogfooded by the migrated `L` shortcut with zero regression — the feature's core promise ("the second map shortcut is cheap, and the first one proves it"). US3 (the ADR + conflict tests) completes governance and is required to close backlog #261, but the code is already shippable after US2.

**Incremental delivery**:
1. Setup + Foundational → the mechanism compiles and is importable.
2. US1 → the convention is verified for a new shortcut (the core deliverable).
3. US2 → `L` is migrated; #260 stays green (the no-regression boundary).
4. US3 → ADR-039 + conflict surfacing (discoverability + safety).
5. Polish → green gate, evidence, post, PR.

**Parallelism is limited** (one small package, several tasks share `MapKeyboardShortcutProvider.tsx`). The genuine `[P]` wins: T001‖T002 (scaffold), T016 ADR alongside the US3 tests, and T019‖T020 (evidence). Everything else is effectively sequential for a single implementer.

**Watch-outs carried from the review**: bind via the callback-ref/`container` element so the listener can't silently fail (1A, T007); apply auto-repeat-off to `L` too and keep FR-010's amendment in mind (2A, T011/T012); guard the warn with `NODE_ENV !== 'production'` so C10/C11 run under vitest (3A, T006/T014). Do **not** touch the Leaflet snapshot/restore effect (`MapView.tsx:401-438`) during the migration.

# Implementation Plan: First-class keyboard-shortcut convention for MapView

**Branch**: `275-mapview-keyboard-shortcuts` (cloud session branch: `claude/quirky-lovelace-e3rv9`) | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/275-mapview-keyboard-shortcuts/spec.md`
**Backlog**: #261 (Tech Debt, Priority Low)

## Summary

Codify the map keyboard-shortcut decisions that PR #260 made once, inline, for the `L` viewport-lock key (`shared/components/src/MapView/MapView.tsx:983-998`) into a **reusable `useMapKeyboardShortcut` hook** in `@debrief/components`, so the second map shortcut (the backlog names `/`, `[`, `]`, Space as candidates) inherits focus-scoping, the no-modifier default, the typing-guard, single-fire/`preventDefault`, and clean-up by default. The hook is fed by a small **`MapKeyboardShortcutProvider`** (a logical context provider, no DOM of its own) that owns a single `keydown` listener on the map's existing focusable wrapper `<div tabIndex={0}>` and a **key registry** (the runtime source of truth that surfaces duplicate-key conflicts). The existing `L` shortcut is **migrated onto the hook** as the first adopter — behaviour-identical, so #260's `keyboardShortcut.test.tsx` and `viewportLock.test.tsx` stay green — and a new **ADR-039** documents the reserved single-letter keys (`L`), the default policy, the Leaflet-reserved keys that are off-limits, and the procedure for claiming a new key.

No new runtime dependencies; no schema change; no service/persistence touch. This is a frontend component-library refactor + a governance ADR.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, Article XV), React 18.x
**Primary Dependencies**: React 18.x (hooks + context), `@debrief/components` (host package). react-leaflet 4.2 / Leaflet 1.9.x are **context only** — the mechanism is a DOM listener on the wrapper div and deliberately does **not** depend on `useMap()` or `map.keyboard` (see Research D1). **No new dependencies.**
**Storage**: N/A — runtime interaction only; nothing persisted.
**Testing**: Vitest ^1.0 + @testing-library/react ^14 + jsdom ^24 (already the `shared/components` stack). New hook tests in `shared/components/src/hooks/__tests__/`; existing `MapView/__tests__/keyboardShortcut.test.tsx` is the #260 regression boundary.
**Target Platform**: Browser — VS Code webview + web-shell (anywhere `MapView` renders).
**Project Type**: single — shared React component library within the pnpm monorepo (frontend).
**Performance Goals**: Negligible. One `keydown` listener per map; O(1) `Map` lookup per keypress; no render-path impact (60 fps unaffected).
**Constraints**: Offline-capable (local only); strict typing with **zero `any`** and **no unchecked casts** (narrow `event.target` via `instanceof HTMLElement`, not `as` — ADR-011/ADR-038); no new deps (Article IX).
**Scale/Scope**: Small. 1 hook + 1 provider/context + 1 tiny internal adopter component + migrate 1 shortcut + 1 ADR + tests. Estimate 1–2 dev-days (matches backlog).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevance | Status |
|---------|-----------|--------|
| I. Defence-Grade Reliability | Keyboard handling is fully local/offline; no silent failure — duplicate-key conflict is surfaced (FR-012), not swallowed. | ✅ Pass |
| II. Schema Integrity | No data model / LinkML change. | ✅ N/A |
| III. Data Sovereignty | No transformation, no provenance surface. | ✅ N/A |
| IV. Architectural Boundaries | Frontend-only hook; no service call, **no persistence** (IV.2/IV.4 untouched), no MCP. | ✅ Pass |
| V. Extensibility | The hook **is** an extensibility primitive — the point is fail-safe, low-friction addition of map shortcuts. | ✅ Pass |
| VI. / VII. Testing | Hook + provider get Vitest unit tests; #260 regression suite must stay green; acceptance scenarios from spec drive the tests. | ✅ Pass (planned) |
| VIII. Documentation | **ADR-039 is a deliverable** (FR-011). Spec already written. `quickstart.md` documents the developer flow. | ✅ Pass |
| IX. Dependencies | **Zero new dependencies.** | ✅ Pass |
| X. Security | No secrets, no network. | ✅ N/A |
| XI. Internationalisation | The hook has **no analyst-facing strings**. The only string is a developer-facing `console.warn` for key conflicts (dev-only) — not subject to i18n. | ✅ Pass |
| XV. Strict Type Safety | Hook fully typed; options type explicit; **no `any`**; `event.target` narrowed by `instanceof` (no cast). The migration also removes the existing `as HTMLElement` cast at `MapView.tsx:987`, a net compliance improvement. | ✅ Pass |

**Gate result: PASS — no violations, no Complexity Tracking entries required.**

(Boundary-type rule / ADR-033: N/A — this feature defines a fresh `MapKeyboardShortcutOptions` type that mirrors no existing typed source, so there is no `Pick`/`Omit` derivation obligation.)

## Project Structure

### Documentation (this feature)

```text
specs/275-mapview-keyboard-shortcuts/
├── plan.md              # This file
├── research.md          # Phase 0 — design decisions (listener location, registry model, key policy)
├── data-model.md        # Phase 1 — types/entities (options, registry entry, context value, reserved-key sets)
├── quickstart.md        # Phase 1 — "add a map shortcut in 5 lines" + run-tests + consult-ADR
├── contracts/
│   ├── useMapKeyboardShortcut.contract.md   # Public TS surface + behavioural contract
│   └── keyboard-policy.contract.md           # Default policy table + conflict-warning contract
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
shared/components/src/
├── hooks/
│   ├── useMapKeyboardShortcut.ts            # NEW — consumer hook (register on mount / unregister on unmount)
│   ├── MapKeyboardShortcutProvider.tsx      # NEW — provider + context + single keydown listener + registry + policy
│   └── __tests__/
│       └── useMapKeyboardShortcut.test.tsx  # NEW — US1 unit tests (focus, modifiers, typing, non-letter, repeat, unmount, conflict, multi-shortcut)
├── MapView/
│   ├── MapView.tsx                          # MODIFIED — add containerRef, wrap subtree in provider, replace inline handleRootKeyDown with an internal <ViewportLockShortcut/> that calls the hook
│   └── __tests__/
│       ├── keyboardShortcut.test.tsx        # UNCHANGED — #260 `L` regression (must stay green — FR-010)
│       └── viewportLock.test.tsx            # UNCHANGED — #260 lock regression
└── index.ts                                 # MODIFIED — export useMapKeyboardShortcut, MapKeyboardShortcutProvider, and their public types

docs/project_notes/decisions.md             # MODIFIED — append ADR-039 (reserved keys + policy + claim procedure)
```

**Structure Decision**: Single shared library. The hook and provider live alongside the existing custom hooks (`useSelection`, `useTheme`, `useIsMobile`) in `shared/components/src/hooks/`, exported individually from the barrel `src/index.ts` (the established pattern, `index.ts:110-114`). The context/provider mirrors the existing `ThemeProvider`/`ThemeContext` split convention. The `L` migration is contained entirely within `MapView.tsx` — its public behaviour (a `keydown` on `.debrief-mapview` toggling `onViewportLockChange` under the #260 guards) is unchanged, so no consumer of `MapView` and no existing test needs to change.

## Media Components

**None — infrastructure feature (a hook + an ADR).** No new visual component and no significant visual change: the only user-visible behaviour is the `L` viewport-lock toggle, which is **already** demonstrated by #260's existing viewport-lock Storybook story and is behaviour-identical after migration. The narrative value of this feature is developer-ergonomics (one call site instead of four re-litigated concerns) and governance (the ADR) — neither is a Storybook demo. The eventual feature post will lead with a before/after code contrast and the reserved-key registry table, not an interactive component (see `evidence/opening-context.md`).

*Inclusion criteria applied:* New visual component? No. Significant visual change? No. Interactive demo adds narrative value? No (the interaction is #260's, already demoed).

## Storybook E2E Testing

**None — no new interactive UI component.** The keyboard behaviour is fully covered at the unit level by Vitest + @testing-library/react (`fireEvent.keyDown` against a focusable container in jsdom), which is how #260's `keyboardShortcut.test.tsx` already exercises this exact surface. No new Storybook story is introduced, so there is nothing new to drive with Playwright.

## Web-Shell E2E Testing

**None — no extension workflow change.** The `L` shortcut's end-user behaviour is preserved verbatim; its coverage continues to come from #260's existing tests plus the new hook unit tests. No new full-workflow path is added (the candidate shortcuts `/`, `[`, `]`, Space are explicitly out of scope). If #260 shipped a web-shell E2E for the lock, it is re-run unchanged as part of CI and must stay green; this feature adds no new web-shell spec.

## Complexity Tracking

No Constitution violations — section intentionally empty.

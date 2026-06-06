# UI Mockup Review — Outcomes (Phase 2.5 GATE, T033)

**Status**: ✅ APPROVED — Phase 3 unblocked.

**Reviewer**: Project owner (via /speckit.implement session)
**Review date**: 2026-05-04

## Decision

> **Approved by Project owner on 2026-05-04** — all seven mockups
> accepted as drawn, recommendations on the six open questions accepted
> by default.

### Locked decisions (Phase 3 must honour)

1. **Mockup 02 — iPad portrait**: **Option A** (one card per row).
2. **Mockup 03 — Score editor**: **Unified V·M·A sheet** (one open, three steppers, live Total).
3. **Mockup 03 — Absent score**: stepper button labelled `-` (matches existing desktop ScorePicker).
4. **Mockup 04 — Save behaviour**: commit-and-close.
5. **Mockup 06 — Update banner**: top-of-viewport banner (above app chrome).
6. **Mockup 07 — Touch-friendly trigger**: `@media (pointer: coarse)`.

All other "Open questions" sections in the individual mockup files are
accepted at their drawn defaults.

## Files to review

Seven low-fidelity ASCII / box-drawing wireframes were authored to lock
information hierarchy and tap-target placement before any Phase 3+ React
components are written. Spacing / typography / colour are deferred to real
CSS in Phase 3 — the wireframes are about **what** appears and **where**,
not what it looks like.

| # | File | User Story | Viewport |
|---|------|------------|----------|
| 01 | [01-cardlist-iphone.md](./01-cardlist-iphone.md) | US1 — browse/find from a phone | 375 × 812 |
| 02 | [02-cardlist-ipad-portrait.md](./02-cardlist-ipad-portrait.md) | US1 (tablet portrait variant — pick option A/B) | 768 × 1024 |
| 03 | [03-bottomsheet.md](./03-bottomsheet.md) | US2 — bottom-sheet editor (Status / Score / Category) | 375 × 812 |
| 04 | [04-description-editor.md](./04-description-editor.md) | US3 — full-screen Markdown editor + discard-confirm | 375 × 812 |
| 05 | [05-push-bar.md](./05-push-bar.md) | US4 — sticky push bar (clean / dirty / conflict / success states) | 375 × 812 |
| 06 | [06-pwa-states.md](./06-pwa-states.md) | US5 — installed PWA offline + update-available banner | 375 × 812 |
| 07 | [07-ipad-landscape-parity.md](./07-ipad-landscape-parity.md) | parity check — desktop layout still owns ≥ 1024 px | 1024 × 768 |

## Open questions surfaced by the mockups

Each mockup has its own "Open questions" section. The most-impactful ones
that need a reviewer decision before Phase 3:

1. **Mockup 02 — iPad-portrait card layout**: Option A (one card per row)
   or Option B (2-column grid)? Recommendation = A for code simplicity.

2. **Mockup 03 — Score editor surface**: unified V·M·A sheet (one open,
   three steppers) or per-axis sheets (one stepper per open)?
   Recommendation = unified, fewer taps.

3. **Mockup 03 — "absent" score affordance**: stepper button labelled
   `-` or a separate "Clear" link? Recommendation = stepper button (matches
   existing desktop ScorePicker convention).

4. **Mockup 04 — Save behaviour after Description edit**: commit and close,
   or commit and stay open? Recommendation = commit and close.

5. **Mockup 06 — Update banner placement**: top of viewport (drawn) or
   bottom-right corner chip (less intrusive)? Recommendation = top, for
   discoverability per Article XII.

6. **Mockup 07 — Touch-friendly mode trigger**: `navigator.maxTouchPoints`
   or `@media (pointer: coarse)`? Recommendation = the CSS query.

## How to approve

**Option A — Approve as drawn**: paste the line below verbatim, signed
and dated, then commit. Phase 3 can begin.

```
Approved by <your-name> on YYYY-MM-DD — all seven mockups accepted as drawn,
recommendations on the six open questions above accepted by default.
```

**Option B — Approve with changes**: list the deltas inline, then sign.
The implementer (Claude or human) iterates the affected mockup files
in this same task before proceeding. Example:

```
Approved-with-changes by <your-name> on YYYY-MM-DD:
- Mockup 02: pick Option B (2-column grid).
- Mockup 03: per-axis sheets, NOT unified.
- Mockup 06: bottom-right chip for the update banner.
- All other mockups + recommendations accepted.
```

**Option C — Redirect**: surface specific concerns as comments on the
relevant mockup files; do not yet sign. The implementer revises and
re-surfaces.

---

## Reviewer signature line

(Edit this section with your decision; nothing below this point until
the approval line is added.)

_Pending review. Add Option A / B / C signature here._

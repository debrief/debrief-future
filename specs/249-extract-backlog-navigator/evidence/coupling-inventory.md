# Coupling Inventory (referrer)

The canonical Phase 0 audit document for this feature lives at:

  [`docs/extraction-audit/backlog-navigator/coupling-inventory.md`](../../../docs/extraction-audit/backlog-navigator/coupling-inventory.md)

This file is a stable in-evidence referrer so the audit is discoverable
from `specs/249-extract-backlog-navigator/evidence/`. The canonical
path is the authoritative one and is what Phase 1 / Phase 3 task
descriptions reference.

## Summary of audit findings

- **9 `[coupling]` literals** to relocate from production source:
  - `DEFAULT_OWNER`, `DEFAULT_REPO` in `src/github/api.ts`
  - `name`, `short_name`, `description`, `theme_color`, `background_color`
    in `vite.config.ts` PWA manifest
  - `useIsMobile` import × 2 + a stale test-setup comment
- **0 `[coupling]` literals in `src/strings.ts`** — the production host
  string never appears in `src/`. Phase 1 adds a new `host` const
  preemptively for adopter-build flexibility.
- **1 workspace dependency** (`@debrief/components/hooks/useIsMobile`) —
  inline-copied per R-007.
- **4 dedicated repo-level workflows** + 2 references in `ci.yml` — all
  scheduled for Phase 3 cutover.
- **`@lhci/cli` is backlog-navigator-only** in the root `package.json` —
  removable in Phase 3.
- **`heroku.yml`, `app.json`, `Dockerfile.preview`**: confirmed clean.

See the canonical document for the full file:line citation table and
the §6 Phase 1 patch list that drove tasks T015–T024.

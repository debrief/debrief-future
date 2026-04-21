# Usage Example — 214-utils-drift-guard

This is the US1 golden-path scenario: a contributor accidentally reintroduces
a local `calculateBounds` under `apps/*`, runs `pnpm lint`, sees the guard
fail with a self-documenting message, and resolves the issue by importing
from `@debrief/utils`.

## Setup

Clean tree post-implementation of spec #214. The five `@debrief/*` drift
rules are wired into every `apps/*/.eslintrc.cjs`; `task lint` aggregates
`pnpm lint`, the wiring-forgotten meta-check, and the grandfathered
`scripts/check-no-geojson-feature.sh`.

## Walk

### Step 1 — introduce the drift

The contributor creates `apps/vscode/src/utils/bounds.ts`:

```ts
// apps/vscode/src/utils/bounds.ts
export function calculateBounds(features: unknown[]): number[] {
  // ... local implementation ...
  return [0, 0, 0, 0];
}
```

### Step 2 — run lint

```sh
pnpm --filter debrief-vscode lint
```

### Step 3 — observe the failure

The guard fails with:

```text
/home/user/debrief-future/apps/vscode/src/utils/bounds.ts
  1:8  error  'calculateBounds' is exported by '@debrief/utils'. Do not redeclare it under apps/*. Replace this declaration with: import { calculateBounds } from '@debrief/utils';  no-restricted-syntax

✖ 1 problem (1 error, 0 warnings)
```

The message names:
- **The offending file** (via ESLint's standard file-prefix formatting).
- **The duplicated symbol** (`'calculateBounds'`).
- **The canonical package** (`'@debrief/utils'`).
- **The fix** (`import { calculateBounds } from '@debrief/utils';`).

No ANSI codes, no multi-line formatting — readable in any CI log or terminal.

### Step 4 — apply the fix

Replace the local declaration with an import:

```ts
// apps/vscode/src/utils/bounds.ts
import { calculateBounds } from '@debrief/utils';

export { calculateBounds };
```

Or — if the call-site was the only consumer — delete the file and import
`calculateBounds` directly at each call-site.

### Step 5 — verify

```sh
pnpm --filter debrief-vscode lint
```

Exit 0. The drift is gone; `@debrief/utils.calculateBounds` is now the
single source of truth.

## The five guarded packages

The same pattern applies to every `@debrief/*` package the monorepo ships:

| Package | Canonical index barrel |
|---------|------------------------|
| `@debrief/utils` | `shared/utils/src/index.ts` |
| `@debrief/schemas` | `shared/schemas/src/generated/typescript/index.ts` |
| `@debrief/components` | `shared/components/src/index.ts` |
| `@debrief/session-state` | `services/session-state/src/index.ts` (transitive `export *` walker follows `./types/index.js` forwarding chains) |
| `@debrief/data` | `shared/data/src/ts/index.ts` |

An `apps/*` file that declares an original export whose name matches ANY
member of ANY of these packages' export surfaces fails lint with a message
naming the specific source package.

## See also

- `specs/214-utils-drift-guard/quickstart.md` — 12 numbered walks covering
  every acceptance scenario across US1–US6.
- `specs/214-utils-drift-guard/contracts/rule-contract.md` — the formal
  module-interface and message-shape contract.
- `docs/project_notes/decisions.md` ADR-020 — architectural rationale.

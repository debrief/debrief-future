We shipped both refusals.

Two weeks ago we planned to set up an unused-code scanner for the Electron loader. The baseline: twelve findings, eleven false positives and one genuine orphan (`updater.ts`, a commented-out import with zero call sites).

We could have reached for two shortcuts. Both would have quieted the scanner. Both were wrong.

Shortcut one: ignore the real finding. That makes the scanner output clean and the codebase quietly dishonest.

Shortcut two: run knip ad-hoc via `pnpm dlx` instead of pinning it. But the moment CI depends on a tool's output, the version has to be locked.

We shipped the hard way instead: deleted the orphan, pinned knip at 5.88.1, wired it into the CI gate right after lint, added a JSON Schema that rejects future ignore entries.

Result: twelve findings → zero. Twelve stays zero because the gate is now in place and the contract prevents shortcuts.

Small work, worth naming because it's about what "engineered enough" actually means for infrastructure. A scanner that silences true findings or depends on unpinned versions isn't a tool — it's a lullaby.

[Read the shipped post](https://debrief.github.io/shipped-knip-config-for-the-electron-loader-a-ci-gate/)

#FutureDebrief #OpenSource #EngineeringDiscipline

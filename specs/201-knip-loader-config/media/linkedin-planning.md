Two shortcuts would have made our unused-code scanner quiet. Neither would have made it honest.

The scanner reports twelve findings under the Electron loader. Eleven are false positives — knip can't see where an Electron app starts. The twelfth, a never-imported auto-updater module, is real.

Shortcut one: add the module to an ignore list. Clean output, zero code changes, and a codebase quietly hiding a true finding.

Shortcut two: run knip ad-hoc via `pnpm dlx` instead of pinning it. One line lighter — but the moment CI depends on a tool's output, its version has to be locked.

We refused both. The plan: a fifteen-line config declaring the three real Electron entry points, delete the orphan, pin knip as a dev dependency, wire it into the CI gate after lint. Twelve findings become zero, and stay zero.

Small hygiene work. The discipline worth naming is that "engineered enough" for a scanner means it tells the truth under load — not that it reports zero findings.

Read the plan: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource

The icons on Debrief's Log Panel tell you at a glance whether each step in an analysis was an import, a styling change, a calculation, a filter, or a snapshot. Until this week those icons were driven by a hand-maintained lookup table that every new tool had to be added to — or the icon silently rendered neutral grey.

That file is gone. Every tool now declares its category at the point where it is registered. A LinkML enum is the single source of truth; Pydantic, JSON Schema and TypeScript regenerate from it, so typos fail at validation time or at `pnpm typecheck` rather than at render time. A first-party coverage test walks the registry and fails CI if any shipped tool forgets to declare.

22 tools migrated, 64 new tests, zero lines of hand-maintained mapping remaining. The signal in the icons now stays correct by construction.

Full write-up: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource

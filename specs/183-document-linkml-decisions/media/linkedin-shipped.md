We just added six Architectural Decision Records to Future Debrief, documenting the rationale behind the platform schema overhaul.

Why document decisions separately? Because two of the six were revised during implementation. The planning post said to keep legacy flat fields alongside the new structure. The Constitution said otherwise: one canonical format, fix the data. The ADRs record what was actually decided and why — not what was originally proposed.

Now every contributor working on downstream features (compound filtering, NL queries) can find the rationale without archaeology: why only `id` is required on platform records, why flat aggregates were removed, why enum placement follows dependency direction.

Zero code changed. All value is in the institutional memory.

Full post: [link to full post]

#FutureDebrief #MaritimeAnalysis #OpenSource #ArchitecturalDecisions

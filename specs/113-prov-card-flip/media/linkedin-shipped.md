Parameters live on the Log Panel now — no dialog hop required.

We replaced the separate Tune dialog with an inline flip-card interaction. Hover over a provenance entry, click the pencil icon, and the card rotates via CSS 3D to reveal the edit face. Sliders for bounded numbers, dropdowns for enums, colour pickers for named colours. Change a value and the tool re-executes live — the map updates immediately. Click Done to flip back.

The edit face also surfaces disable (skip this step during replay but keep it in the timeline), delete (soft-remove with a confirmation prompt), and a rationale field for analyst notes. Schemas load lazily on first flip and cache for the session. Only one card may be in edit mode at a time — flipping a second card implicitly commits the first. Single-card constraint prevents conflicting replays and keeps the UI coherent.

The tricky part was the disable cascade. When an entry is disabled, we need to know which downstream entries depend on its outputs and auto-disable them too. That requires traversing the used/generated graph, but graphs can have cycles. Added a visited guard to prevent infinite loops without adding a heavy dependency — just a Set.

597 components tests, 335 extension tests, all building and shipping.

[Link to full shipped post]

#FutureDebrief #MaritimeAnalysis #ProvenanceTracking

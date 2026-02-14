# LinkedIn Shipped Summary: Drawing UX Guidance and STAC Persistence

User-drawn shapes now get context-sensitive guidance, automatic colour assignment, and full provenance tracking in Future Debrief.

The DrawingGuidanceOverlay shows instructions at the bottom-centre of the map — "Click to place point", "Click and drag to draw rectangle", "Press Esc to cancel". Each drawing mode gets specific text, positioned to avoid toolbar conflicts.

Consecutive shapes receive visually distinct colours from an 8-colour sequential palette (blue, orange, cyan, purple, green, red, brown, grey). The palette cycles after eight shapes and resets each session.

Every drawn shape embeds provenance metadata: source="user-drawn", timestamp, operator, and action. This follows the same pattern as imported features, ensuring every transformation records lineage.

565 component tests pass, 528 session-state tests pass, zero new dependencies. All constitution gates pass. The drawing toolchain is now complete.

Read more: [link to full post]

#FutureDebrief #MaritimeAnalysis #OpenSource

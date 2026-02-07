/**
 * Contract: New message type added to ExtensionToWebviewMessage union.
 *
 * This is the API contract for the setDisplayMode message
 * sent from the VS Code extension host to the map webview.
 */

/** Set display mode for temporal track rendering */
export interface SetDisplayModeMessage {
  type: 'setDisplayMode';
  /** 'full' = entire track + highlight marker; 'trail' = snail-trail to current time */
  displayMode: 'full' | 'trail';
}

/**
 * TrackRenderer public API additions:
 *
 * setCurrentTime(time: number): void
 *   - Updates the current temporal position (epoch ms)
 *   - Re-renders all tracks with temporal filtering
 *   - In 'full' mode: shows highlight markers at current position
 *   - In 'trail' mode: slices track to show only start→currentTime
 *
 * setDisplayMode(mode: 'full' | 'trail'): void
 *   - Switches between full-track and snail-trail rendering
 *   - Re-renders all tracks with new mode
 *
 * clearTemporalState(): void
 *   - Resets to static rendering (no temporal filtering)
 *   - Removes all highlight markers
 *   - Restores full polylines
 */

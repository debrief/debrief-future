/**
 * PresentChrome — visible when the SPA is in Present mode.
 *
 * By default no chrome is rendered (chrome-hidden — FR-023). The
 * `ModeToggle` component handles the hover-revealed corner control and
 * the `P` keyboard shortcut so the user is never trapped (FR-024).
 */

import type { FC, ReactNode } from 'react';
import { ModeToggle } from './ModeToggle';

export interface PresentChromeProps {
  children?: ReactNode;
}

export const PresentChrome: FC<PresentChromeProps> = ({ children }) => {
  return (
    <div data-testid="briefing-present-chrome" style={styles.wrapper}>
      {children}
      <div style={styles.toggleSlot}>
        <ModeToggle />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    // Sit above Leaflet's panes (z-index 200..700) so the hover-revealed
    // "Exit Present" toggle is reliably clickable.
    zIndex: 1000,
  },
  toggleSlot: {
    pointerEvents: 'auto',
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
  },
};

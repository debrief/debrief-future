/**
 * MinimalChrome — visible in the default Minimal display mode.
 * Wraps the transport bar, the time slider, the Scene counter, and the
 * mode-toggle button in a compact bottom panel.
 */

import type { FC, ReactNode } from 'react';
import { useBriefingStore } from '../store';
import { TransportBar } from './TransportBar';
import { TimeSlider } from './TimeSlider';
import { ModeToggle } from './ModeToggle';

export interface MinimalChromeProps {
  children?: ReactNode;
}

export const MinimalChrome: FC<MinimalChromeProps> = ({ children }) => {
  const title = useBriefingStore((s) => s.config?.storyboardName ?? '');

  return (
    <div data-testid="briefing-minimal-chrome" style={styles.wrapper}>
      {children}
      <div data-testid="briefing-minimal-titlebar" style={styles.titlebar}>
        <span style={styles.title}>{title}</span>
        <ModeToggle />
      </div>
      <div data-testid="briefing-minimal-controls" style={styles.controls}>
        <TransportBar />
        <TimeSlider />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
  },
  titlebar: {
    pointerEvents: 'auto',
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    left: '0.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.5rem 0.75rem',
    background: 'rgba(0, 0, 0, 0.55)',
    borderRadius: '6px',
    color: '#f0f0f0',
    backdropFilter: 'blur(6px)',
  },
  title: {
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  controls: {
    pointerEvents: 'auto',
    position: 'absolute',
    left: '0.5rem',
    right: '0.5rem',
    bottom: '0.5rem',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    padding: '0.5rem 0.75rem',
    background: 'rgba(0, 0, 0, 0.55)',
    borderRadius: '6px',
    backdropFilter: 'blur(6px)',
  },
};

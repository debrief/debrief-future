/**
 * ModeToggle — switches the SPA between Minimal (default) and Present mode.
 *
 * Reachability invariants (FR-024, spa-loading.md § Display modes):
 *   - In Minimal mode, the toggle is always visible.
 *   - In Present mode, all chrome is hidden by default. A keyboard
 *     shortcut (`P`) toggles back. Mouse movement near the top-right
 *     reveals a discreet "Exit Present" affordance for 3 seconds.
 */

import { type FC, useEffect } from 'react';
import { useBriefingStore } from '../store';

export interface ModeToggleProps {
  className?: string;
}

const HOVER_REVEAL_MS = 3000;

export const ModeToggle: FC<ModeToggleProps> = () => {
  const mode = useBriefingStore((s) => s.displayMode);
  const toggleVisible = useBriefingStore((s) => s.modeToggleVisible);
  const toggle = useBriefingStore((s) => s.toggleDisplayMode);
  const setModeToggleVisible = useBriefingStore((s) => s.setModeToggleVisible);

  // Keyboard shortcut — always reachable, even in Present mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  // In Present mode, hover near the top-right reveals the toggle for 3 s.
  useEffect(() => {
    if (mode !== 'present') {
      // Outside Present mode the toggle is always visible.
      setModeToggleVisible(true);
      return;
    }

    setModeToggleVisible(false);
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const handleMove = (e: MouseEvent) => {
      const nearTopRight = e.clientX > window.innerWidth - 120 && e.clientY < 80;
      if (nearTopRight) {
        setModeToggleVisible(true);
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => setModeToggleVisible(false), HOVER_REVEAL_MS);
      }
    };

    window.addEventListener('mousemove', handleMove);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [mode, setModeToggleVisible]);

  const visible = mode === 'minimal' || toggleVisible;

  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      data-testid="briefing-mode-toggle"
      aria-label={mode === 'minimal' ? 'Enter Present mode' : 'Exit Present mode'}
      onClick={toggle}
      style={styles.button}
    >
      {mode === 'minimal' ? 'Enter Present (P)' : 'Exit Present (P)'}
    </button>
  );
};

const styles: Record<string, React.CSSProperties> = {
  button: {
    background: 'rgba(0, 0, 0, 0.7)',
    color: '#f0f0f0',
    border: '1px solid #3a3a3a',
    borderRadius: '4px',
    padding: '0.4rem 0.75rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
};

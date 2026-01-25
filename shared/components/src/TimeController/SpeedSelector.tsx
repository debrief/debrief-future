/**
 * SpeedSelector component - dropdown for playback speed selection.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { SpeedSelectorProps, PlaybackSpeed } from './types';

const SPEED_OPTIONS: PlaybackSpeed[] = [1, 2, 4, 8];

/**
 * Dropdown selector for playback speed (1x, 2x, 4x, 8x).
 *
 * @example
 * ```tsx
 * <SpeedSelector
 *   speed={speed}
 *   onSpeedChange={setSpeed}
 * />
 * ```
 */
export function SpeedSelector({
  speed,
  onSpeedChange,
  disabled = false,
  className,
}: SpeedSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  const handleSelect = useCallback(
    (selectedSpeed: PlaybackSpeed) => {
      onSpeedChange(selectedSpeed);
      setIsOpen(false);
    },
    [onSpeedChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'ArrowDown' && isOpen) {
        e.preventDefault();
        const currentIndex = SPEED_OPTIONS.indexOf(speed);
        const nextIndex = Math.min(currentIndex + 1, SPEED_OPTIONS.length - 1);
        const nextSpeed = SPEED_OPTIONS[nextIndex];
        if (nextSpeed !== undefined) onSpeedChange(nextSpeed);
      } else if (e.key === 'ArrowUp' && isOpen) {
        e.preventDefault();
        const currentIndex = SPEED_OPTIONS.indexOf(speed);
        const prevIndex = Math.max(currentIndex - 1, 0);
        const prevSpeed = SPEED_OPTIONS[prevIndex];
        if (prevSpeed !== undefined) onSpeedChange(prevSpeed);
      }
    },
    [disabled, isOpen, speed, onSpeedChange]
  );

  return (
    <div
      ref={containerRef}
      className={`debrief-speed-selector ${isOpen ? 'debrief-speed-selector--open' : ''} ${disabled ? 'debrief-speed-selector--disabled' : ''} ${className ?? ''}`}
    >
      <button
        type="button"
        className="debrief-speed-selector__button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Playback speed: ${speed}x`}
      >
        <span className="debrief-speed-selector__value">{speed}x</span>
        <svg
          className="debrief-speed-selector__arrow"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {isOpen && (
        <ul className="debrief-speed-selector__dropdown" role="listbox">
          {SPEED_OPTIONS.map((option) => (
            <li
              key={option}
              className={`debrief-speed-selector__option ${option === speed ? 'debrief-speed-selector__option--selected' : ''}`}
              role="option"
              aria-selected={option === speed}
              onClick={() => handleSelect(option)}
            >
              {option}x
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

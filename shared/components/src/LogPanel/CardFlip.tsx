/**
 * CardFlip — pure CSS 3D flip animation container.
 *
 * Takes isFlipped, front, and back children. Has no knowledge of
 * entries, schemas, or parameters — it only manages the flip transform.
 *
 * Review Decision 6A: Pure animation primitive.
 * Feature: 113-prov-card-flip
 */

import React from 'react';
import './CardFlip.css';

export interface CardFlipProps {
  /** Whether the card is currently flipped to show the back face. */
  readonly isFlipped: boolean;
  /** Content for the front face. */
  readonly front: React.ReactNode;
  /** Content for the back face. */
  readonly back: React.ReactNode;
  /** Optional CSS class name for the container. */
  readonly className?: string;
  /** Optional data-testid for testing. */
  readonly 'data-testid'?: string;
}

export function CardFlip({
  isFlipped,
  front,
  back,
  className,
  'data-testid': testId,
}: CardFlipProps): React.ReactElement {
  return (
    <div
      className={`card-flip ${className ?? ''}`}
      data-testid={testId}
    >
      <div
        className={`card-flip__inner ${isFlipped ? 'card-flip__inner--flipped' : ''}`}
      >
        <div className="card-flip__face card-flip__face--front">
          {front}
        </div>
        <div className="card-flip__face card-flip__face--back">
          {back}
        </div>
      </div>
    </div>
  );
}

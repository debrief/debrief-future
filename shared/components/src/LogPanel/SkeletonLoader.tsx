/**
 * SkeletonLoader — shimmer placeholder shown while schema loads.
 * Feature: 113-prov-card-flip
 */

import React from 'react';
import './SkeletonLoader.css';

export interface SkeletonLoaderProps {
  /** Number of skeleton rows to display. */
  readonly rows?: number;
  readonly className?: string;
}

export function SkeletonLoader({
  rows = 4,
  className,
}: SkeletonLoaderProps): React.ReactElement {
  return (
    <div
      className={`skeleton-loader ${className ?? ''}`}
      data-testid="skeleton-loader"
      role="status"
      aria-label="Loading parameter schema"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="skeleton-loader__row"
          style={{ width: `${70 + Math.random() * 30}%` }}
        />
      ))}
    </div>
  );
}

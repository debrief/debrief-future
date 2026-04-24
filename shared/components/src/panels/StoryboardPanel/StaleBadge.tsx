/**
 * StaleBadge — per-row stale-thumbnail indicator rendered alongside
 * a Scene's thumbnail in the Storyboard panel (Feature 218).
 *
 * Phase 1: typed skeleton returning null. Real implementation lands
 * in Phase 4 T083 (tooltip listing unresolved feature IDs + Refresh-
 * thumbnail button + aria-describedby).
 */

import React from 'react';

export interface StaleBadgeProps {
  readonly sceneId: string;
  readonly unresolvedFeatureIds: readonly string[];
  readonly onRefreshThumbnail: () => void;
}

export const StaleBadge: React.FC<StaleBadgeProps> = () => {
  return null;
};

/**
 * Verifies the Storyboard section (UX-review flatten): when a `storyboard`
 * props bundle is provided, ActivityPanel renders a child StoryboardPanel as
 * its 5th collapsible section; when omitted, no Storyboard section appears.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityPanel } from '../ActivityPanel';
import type { StoryboardPanelProps } from '../../panels/StoryboardPanel/types';

const minimalStoryboard: StoryboardPanelProps = {
  scenes: [],
  activeStoryboardName: null,
  captureInFlight: false,
  onCaptureClick: () => {},
  onSceneRowClick: () => {},
  banner: <div data-testid="sb-banner">session-only</div>,
};

describe('ActivityPanel — storyboard section', () => {
  it('renders the Storyboard section (child StoryboardPanel) when props are provided', () => {
    const { container } = render(
      <ActivityPanel timeUiState="empty" storyboard={minimalStoryboard} />,
    );
    // A 5th section header titled "Storyboard".
    const sectionTitles = Array.from(
      container.querySelectorAll('.debrief-activity-panel__section-title'),
    ).map((el) => el.textContent);
    expect(sectionTitles).toContain('Storyboard');
    // The child StoryboardPanel renders (its root testid) along with the
    // host-supplied banner.
    expect(screen.getByTestId('storyboard-panel')).toBeInTheDocument();
    expect(screen.getByTestId('sb-banner')).toBeInTheDocument();
  });

  it('does not render a Storyboard section when no storyboard props are provided', () => {
    const { container } = render(<ActivityPanel timeUiState="empty" />);
    const sectionTitles = Array.from(
      container.querySelectorAll('.debrief-activity-panel__section-title'),
    ).map((el) => el.textContent);
    expect(sectionTitles).not.toContain('Storyboard');
    expect(screen.queryByTestId('storyboard-panel')).toBeNull();
  });
});

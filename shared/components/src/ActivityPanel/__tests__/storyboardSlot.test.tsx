/**
 * Verifies the optional Storyboard section (UX-review flatten): when a
 * `storyboardSlot` is provided, ActivityPanel renders it as a 5th
 * collapsible section; when omitted, no Storyboard section appears.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityPanel } from '../ActivityPanel';

describe('ActivityPanel — storyboardSlot', () => {
  it('renders the Storyboard section when a slot is provided', () => {
    render(
      <ActivityPanel
        timeUiState="empty"
        storyboardSlot={
          <div data-testid="sb-slot-content">storyboard here</div>
        }
      />,
    );
    expect(screen.getByText('Storyboard')).toBeInTheDocument();
    expect(screen.getByTestId('sb-slot-content')).toBeInTheDocument();
  });

  it('does not render a Storyboard section when no slot is provided', () => {
    render(<ActivityPanel timeUiState="empty" />);
    expect(screen.queryByText('Storyboard')).toBeNull();
  });
});

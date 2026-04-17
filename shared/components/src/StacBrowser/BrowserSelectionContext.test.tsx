import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  BrowserSelectionProvider,
  useBrowserSelection,
} from './BrowserSelectionContext';

function Probe() {
  const { selectedItemPath, setSelectedItemPath } = useBrowserSelection();
  return (
    <div>
      <span data-testid="value">{selectedItemPath ?? 'null'}</span>
      <button
        data-testid="set"
        onClick={() => setSelectedItemPath('items/x/item.json')}
      >
        set
      </button>
    </div>
  );
}

describe('BrowserSelectionContext', () => {
  it('exposes selectedItemPath to a consumer wrapped in Provider', () => {
    render(
      <BrowserSelectionProvider initialSelectedItemPath="items/seed/item.json">
        <Probe />
      </BrowserSelectionProvider>,
    );
    expect(screen.getByTestId('value').textContent).toBe('items/seed/item.json');
  });

  it('updates consumer on setSelectedItemPath', () => {
    render(
      <BrowserSelectionProvider>
        <Probe />
      </BrowserSelectionProvider>,
    );
    expect(screen.getByTestId('value').textContent).toBe('null');
    act(() => {
      screen.getByTestId('set').click();
    });
    expect(screen.getByTestId('value').textContent).toBe('items/x/item.json');
  });

  it('throws a clear error when used outside Provider', () => {
    const ConsoleError = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Probe />)).toThrow(/inside <BrowserSelectionProvider>/);
    } finally {
      console.error = ConsoleError;
    }
  });
});

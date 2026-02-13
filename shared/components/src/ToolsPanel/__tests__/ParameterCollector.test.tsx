/**
 * Unit tests for ParameterCollector component.
 *
 * The ParameterCollector orchestrates sequential parameter collection by
 * rendering a ContextMenu for each parameter in turn. When all values are
 * collected it calls onComplete; dismissal at any stage calls onCancel.
 *
 * We mock the ContextMenu to isolate ParameterCollector logic (item
 * resolution, sequential stepping, cancellation) from ContextMenu rendering.
 *
 * Feature: 091-tool-parameter-context-menus
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ToolParameter } from '../../ToolMatch/types';

// ---------------------------------------------------------------------------
// Mock @debrief/schemas — the paramTypeResolver imports enum objects from it
// ---------------------------------------------------------------------------
vi.mock('@debrief/schemas', () => ({
  NamedColorEnum: {
    red: 'red',
    green: 'green',
    blue: 'blue',
    yellow: 'yellow',
    orange: 'orange',
    purple: 'purple',
    cyan: 'cyan',
    magenta: 'magenta',
    white: 'white',
    black: 'black',
    grey: 'grey',
  },
  MarkerSymbolEnum: {
    circle: 'circle',
    square: 'square',
    triangle: 'triangle',
    diamond: 'diamond',
    cross: 'cross',
  },
  CardinalDirectionEnum: {
    N: 'N',
    NE: 'NE',
    E: 'E',
    SE: 'SE',
    S: 'S',
    SW: 'SW',
    W: 'W',
    NW: 'NW',
  },
  DurationPresetEnum: {
    PT1M: 'PT1M',
    PT5M: 'PT5M',
    PT15M: 'PT15M',
    PT30M: 'PT30M',
    PT1H: 'PT1H',
    PT2H: 'PT2H',
    PT6H: 'PT6H',
    PT12H: 'PT12H',
    PT24H: 'PT24H',
  },
  NumericPresetEnum: {
    n_1: 'n_1',
    n_2: 'n_2',
    n_5: 'n_5',
    n_10: 'n_10',
    n_25: 'n_25',
    n_50: 'n_50',
    n_100: 'n_100',
  },
}));

// ---------------------------------------------------------------------------
// Mock the ContextMenu component.
//
// We render a lightweight substitute that exposes the same props API (items,
// header, onSelect, onDismiss) via data-testid attributes and clickable
// elements. This isolates ParameterCollector tests from ContextMenu internals
// (which have their own test suite) and sidesteps a useCallback circular-ref
// issue in the real component under jsdom.
// ---------------------------------------------------------------------------
vi.mock('../../ContextMenu', () => ({
  ContextMenu: ({
    items,
    header,
    onSelect,
    onDismiss,
  }: {
    items: Array<{ id: string; label: string }>;
    header?: string;
    onSelect: (id: string) => void;
    onDismiss: () => void;
    showCustomOption?: boolean;
    onCustomValue?: (value: string) => void;
  }) => (
    <div data-testid="context-menu">
      {header && <div data-testid="context-menu-header">{header}</div>}
      {items.map((item) => (
        <div
          key={item.id}
          data-testid={`context-menu-item-${item.id}`}
          role="menuitem"
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </div>
      ))}
      <button
        data-testid="context-menu-dismiss"
        onClick={onDismiss}
        type="button"
      >
        Dismiss
      </button>
    </div>
  ),
}));

// Import *after* mocks are registered
import { ParameterCollector } from '../ParameterCollector';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const colorParam: ToolParameter = {
  name: 'color',
  valueType: 'enum',
  description: 'Choose a color',
  paramType: 'NamedColor',
};

const symbolParam: ToolParameter = {
  name: 'symbol',
  valueType: 'enum',
  description: 'Choose a marker symbol',
  paramType: 'MarkerSymbol',
};

const booleanParam: ToolParameter = {
  name: 'visible',
  valueType: 'boolean',
  description: 'Toggle visibility',
};

const explicitChoicesParam: ToolParameter = {
  name: 'format',
  valueType: 'string',
  description: 'Choose output format',
  choices: ['csv', 'json', 'xml'],
};

const anchorPosition = { x: 100, y: 200 };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ParameterCollector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. Single parameter
  // -----------------------------------------------------------------------
  describe('single parameter', () => {
    it('renders ContextMenu with correct items for a NamedColor param', () => {
      const onComplete = vi.fn();
      const onCancel = vi.fn();

      render(
        <ParameterCollector
          parameters={[colorParam]}
          anchorPosition={anchorPosition}
          onComplete={onComplete}
          onCancel={onCancel}
        />,
      );

      // The context menu should be present
      expect(screen.getByTestId('context-menu')).toBeInTheDocument();

      // Header should show the parameter description
      expect(screen.getByTestId('context-menu-header')).toHaveTextContent(
        'Choose a color',
      );

      // Should have 11 color items rendered from NamedColorEnum
      expect(screen.getByTestId('context-menu-item-red')).toBeInTheDocument();
      expect(screen.getByTestId('context-menu-item-blue')).toBeInTheDocument();
      expect(screen.getByTestId('context-menu-item-grey')).toBeInTheDocument();
      expect(screen.getByTestId('context-menu-item-magenta')).toBeInTheDocument();
    });

    it('calls onComplete with collected value when an item is selected', () => {
      const onComplete = vi.fn();
      const onCancel = vi.fn();

      render(
        <ParameterCollector
          parameters={[colorParam]}
          anchorPosition={anchorPosition}
          onComplete={onComplete}
          onCancel={onCancel}
        />,
      );

      fireEvent.click(screen.getByTestId('context-menu-item-red'));

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith({ color: 'red' });
    });
  });

  // -----------------------------------------------------------------------
  // 2. Multi-parameter sequential flow
  // -----------------------------------------------------------------------
  describe('multi-parameter sequential flow', () => {
    it('advances to second parameter after selecting first, then calls onComplete with both values', () => {
      const onComplete = vi.fn();
      const onCancel = vi.fn();

      render(
        <ParameterCollector
          parameters={[colorParam, symbolParam]}
          anchorPosition={anchorPosition}
          onComplete={onComplete}
          onCancel={onCancel}
        />,
      );

      // First menu: header should show color description
      expect(screen.getByTestId('context-menu-header')).toHaveTextContent(
        'Choose a color',
      );

      // Select a color
      fireEvent.click(screen.getByTestId('context-menu-item-blue'));

      // onComplete should NOT have been called yet (still collecting second param)
      expect(onComplete).not.toHaveBeenCalled();

      // Second menu: header should now show symbol description
      expect(screen.getByTestId('context-menu-header')).toHaveTextContent(
        'Choose a marker symbol',
      );

      // Symbol items should be present
      expect(
        screen.getByTestId('context-menu-item-circle'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('context-menu-item-diamond'),
      ).toBeInTheDocument();

      // Select a symbol
      fireEvent.click(screen.getByTestId('context-menu-item-triangle'));

      // Now onComplete should be called with both values
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith({
        color: 'blue',
        symbol: 'triangle',
      });
    });
  });

  // -----------------------------------------------------------------------
  // 3. Cancellation at first parameter
  // -----------------------------------------------------------------------
  describe('cancellation at first parameter', () => {
    it('calls onCancel when dismissed at first parameter', () => {
      const onComplete = vi.fn();
      const onCancel = vi.fn();

      render(
        <ParameterCollector
          parameters={[colorParam, symbolParam]}
          anchorPosition={anchorPosition}
          onComplete={onComplete}
          onCancel={onCancel}
        />,
      );

      // Click the dismiss button (simulates Escape / click-outside)
      fireEvent.click(screen.getByTestId('context-menu-dismiss'));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 4. Cancellation at second parameter
  // -----------------------------------------------------------------------
  describe('cancellation at second parameter', () => {
    it('calls onCancel (not onComplete) when dismissed after selecting first param', () => {
      const onComplete = vi.fn();
      const onCancel = vi.fn();

      render(
        <ParameterCollector
          parameters={[colorParam, symbolParam]}
          anchorPosition={anchorPosition}
          onComplete={onComplete}
          onCancel={onCancel}
        />,
      );

      // Select a color for first param
      fireEvent.click(screen.getByTestId('context-menu-item-green'));

      // Should have advanced to second param
      expect(screen.getByTestId('context-menu-header')).toHaveTextContent(
        'Choose a marker symbol',
      );

      // Now dismiss at the second parameter
      fireEvent.click(screen.getByTestId('context-menu-dismiss'));

      // onCancel should fire; onComplete should NOT
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 5. Boolean parameter
  // -----------------------------------------------------------------------
  describe('boolean parameter', () => {
    it('renders two descriptive items: Enable and Disable', () => {
      const onComplete = vi.fn();
      const onCancel = vi.fn();

      render(
        <ParameterCollector
          parameters={[booleanParam]}
          anchorPosition={anchorPosition}
          onComplete={onComplete}
          onCancel={onCancel}
        />,
      );

      const trueItem = screen.getByTestId('context-menu-item-true');
      const falseItem = screen.getByTestId('context-menu-item-false');

      expect(trueItem).toBeInTheDocument();
      expect(falseItem).toBeInTheDocument();

      // Labels should contain Enable / Disable wording
      expect(trueItem).toHaveTextContent('Enable visible');
      expect(falseItem).toHaveTextContent('Disable visible');
    });

    it('calls onComplete with selected boolean value id', () => {
      const onComplete = vi.fn();
      const onCancel = vi.fn();

      render(
        <ParameterCollector
          parameters={[booleanParam]}
          anchorPosition={anchorPosition}
          onComplete={onComplete}
          onCancel={onCancel}
        />,
      );

      fireEvent.click(screen.getByTestId('context-menu-item-false'));

      expect(onComplete).toHaveBeenCalledWith({ visible: 'false' });
    });
  });

  // -----------------------------------------------------------------------
  // 6. Explicit choices fallback
  // -----------------------------------------------------------------------
  describe('explicit choices fallback', () => {
    it('renders choices as menu items when no paramType is set', () => {
      const onComplete = vi.fn();
      const onCancel = vi.fn();

      render(
        <ParameterCollector
          parameters={[explicitChoicesParam]}
          anchorPosition={anchorPosition}
          onComplete={onComplete}
          onCancel={onCancel}
        />,
      );

      expect(screen.getByTestId('context-menu-item-csv')).toBeInTheDocument();
      expect(screen.getByTestId('context-menu-item-json')).toBeInTheDocument();
      expect(screen.getByTestId('context-menu-item-xml')).toBeInTheDocument();
    });

    it('calls onComplete with selected choice value', () => {
      const onComplete = vi.fn();
      const onCancel = vi.fn();

      render(
        <ParameterCollector
          parameters={[explicitChoicesParam]}
          anchorPosition={anchorPosition}
          onComplete={onComplete}
          onCancel={onCancel}
        />,
      );

      fireEvent.click(screen.getByTestId('context-menu-item-json'));

      expect(onComplete).toHaveBeenCalledWith({ format: 'json' });
    });
  });

  // -----------------------------------------------------------------------
  // 7. Empty parameters — returns null
  // -----------------------------------------------------------------------
  describe('empty parameters', () => {
    it('returns null when parameters array is empty (no currentParam)', () => {
      const onComplete = vi.fn();
      const onCancel = vi.fn();

      const { container } = render(
        <ParameterCollector
          parameters={[]}
          anchorPosition={anchorPosition}
          onComplete={onComplete}
          onCancel={onCancel}
        />,
      );

      // Component should render nothing
      expect(container.innerHTML).toBe('');
      expect(screen.queryByTestId('context-menu')).not.toBeInTheDocument();
    });
  });
});

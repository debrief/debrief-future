/**
 * Unit tests for the short-height adaptation in ActivityPanel — spec 281 T019.
 *
 * US4 (P2.2): When the panel is UNCONTROLLED AND container clientHeight is
 * below the threshold AND a feature is selected, the INITIAL internal
 * collapseState collapses ONLY the Time Controller so Properties moves toward
 * the fold — WITHOUT hiding Tools or Layers (collapsing those would set them
 * display:none, hiding the feature list the user selects from and the tools
 * they run). It MUST NOT call onCollapseStateChange.
 *
 * Decisions:
 *   #2  — only fires for uncontrolled instances; never calls onCollapseStateChange
 *   #9  — no-op when clientHeight >= 900
 *   #13 — clientHeight read once at mount
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks — must be hoisted (before imports that transitively pull them).
//
// `@debrief/session-state/browser` is a workspace package whose `dist/` is
// not built in CI/test environments; the package.json exports point to
// `dist/browser.js` which does not exist. Any test that renders ActivityPanel
// (which transitively imports SubFeatureEditorMode and selectionMode) must
// stub this module so vite-vitest resolves it without hitting the filesystem.
// ─────────────────────────────────────────────────────────────────────────────
vi.mock('@debrief/session-state/browser', () => ({
  // parsePath is used by SubFeatureEditorMode
  parsePath: vi.fn(() => ({ root: null, levels: [] })),
  // Types only — no runtime values needed beyond the used functions
}));

import { ActivityPanel } from '../ActivityPanel';
import type { ActivityPanelCollapseState } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Override HTMLElement.prototype.clientHeight globally for the duration of
 * a test. Returns a restore function.
 */
function stubClientHeight(value: number): () => void {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => value,
  });
  return () => {
    if (descriptor) {
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', descriptor);
    } else {
      // If no original descriptor, just delete the override
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (HTMLElement.prototype as unknown as Record<string, unknown>)['clientHeight'];
    }
  };
}

/** Render a minimal ActivityPanel (uncontrolled) with a selected feature. */
function renderUncontrolledWithFeature(clientHeight: number, onCollapseStateChange?: (s: ActivityPanelCollapseState) => void) {
  const restore = stubClientHeight(clientHeight);
  const utils = render(
    <ActivityPanel
      timeUiState="empty"
      selectedFeatureIds={['track-1']}
      onCollapseStateChange={onCollapseStateChange}
    />,
  );
  return { ...utils, restore };
}

/** Get the collapsed/expanded state of a section by its title text. */
function isSectionCollapsed(container: HTMLElement, title: string): boolean {
  const sectionTitle = Array.from(
    container.querySelectorAll('.debrief-activity-panel__section-title'),
  ).find((el) => el.textContent === title);
  if (!sectionTitle) throw new Error(`Section "${title}" not found`);
  const section = sectionTitle.closest('.debrief-activity-panel__section');
  if (!section) throw new Error(`No section element for "${title}"`);
  return section.classList.contains('debrief-activity-panel__section--collapsed');
}

// ─────────────────────────────────────────────────────────────────────────────
// Core adaptation: short height + feature selected + uncontrolled
// ─────────────────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ActivityPanel — short-height adaptation (uncontrolled, feature selected)', () => {
  it('collapses ONLY the Time Controller when clientHeight < threshold', () => {
    const { container, restore } = renderUncontrolledWithFeature(700);
    try {
      expect(isSectionCollapsed(container, 'Time Controller')).toBe(true);
    } finally {
      restore();
    }
  });

  it('leaves Tools, Layers and Properties expanded (never hidden)', () => {
    const { container, restore } = renderUncontrolledWithFeature(700);
    try {
      expect(isSectionCollapsed(container, 'Tools')).toBe(false);
      expect(isSectionCollapsed(container, 'Layers')).toBe(false);
      expect(isSectionCollapsed(container, 'Properties')).toBe(false);
    } finally {
      restore();
    }
  });

  it('NEVER calls onCollapseStateChange during the adaptation', () => {
    const spy = vi.fn();
    const restore = stubClientHeight(700);
    render(
      <ActivityPanel
        timeUiState="empty"
        selectedFeatureIds={['track-1']}
        onCollapseStateChange={spy}
      />,
    );
    restore();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// No-op when clientHeight >= 900
// ─────────────────────────────────────────────────────────────────────────────

describe('ActivityPanel — short-height adaptation no-op conditions', () => {
  it('is a no-op when clientHeight = 900 (at threshold boundary)', () => {
    const { container, restore } = renderUncontrolledWithFeature(900);
    try {
      // Time Controller should remain expanded (default)
      expect(isSectionCollapsed(container, 'Time Controller')).toBe(false);
    } finally {
      restore();
    }
  });

  it('is a no-op when clientHeight > 900', () => {
    const { container, restore } = renderUncontrolledWithFeature(1080);
    try {
      expect(isSectionCollapsed(container, 'Time Controller')).toBe(false);
    } finally {
      restore();
    }
  });

  it('is a no-op when no features are selected (short height)', () => {
    const restore = stubClientHeight(700);
    const { container } = render(<ActivityPanel timeUiState="empty" selectedFeatureIds={[]} />);
    restore();
    expect(isSectionCollapsed(container, 'Time Controller')).toBe(false);
  });

  it('is a no-op when controlled (collapseState prop provided)', () => {
    const controlledState: ActivityPanelCollapseState = {
      timeControllerCollapsed: false,
      toolsCollapsed: false,
      layersCollapsed: false,
      propertiesCollapsed: false,
    };
    const spy = vi.fn();
    const restore = stubClientHeight(700);
    const { container } = render(
      <ActivityPanel
        timeUiState="empty"
        selectedFeatureIds={['track-1']}
        collapseState={controlledState}
        onCollapseStateChange={spy}
      />,
    );
    restore();
    // The controlled collapseState passes timeControllerCollapsed=false →
    // the adaptation must NOT override it.
    expect(isSectionCollapsed(container, 'Time Controller')).toBe(false);
    // The spy must not have been called by the adaptation
    expect(spy).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Controlled mode: spy is never called by the adaptation path
// ─────────────────────────────────────────────────────────────────────────────

describe('ActivityPanel — controlled mode isolation', () => {
  it('respects controlled collapse state and does not override it', () => {
    const controlledState: ActivityPanelCollapseState = {
      timeControllerCollapsed: false, // explicitly expanded
      toolsCollapsed: true,
      layersCollapsed: true,
      propertiesCollapsed: false,
    };
    const restore = stubClientHeight(600); // well below threshold
    const { container } = render(
      <ActivityPanel
        timeUiState="empty"
        selectedFeatureIds={['track-1', 'track-2']}
        collapseState={controlledState}
      />,
    );
    restore();
    // Controlled state has timeControllerCollapsed=false — adaptation must NOT
    // override it even though the panel is short and a feature is selected.
    expect(isSectionCollapsed(container, 'Time Controller')).toBe(false);
    // Controlled state has toolsCollapsed=true — must be honoured verbatim.
    expect(isSectionCollapsed(container, 'Tools')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Properties is reachable (section renders and is not collapsed)
// ─────────────────────────────────────────────────────────────────────────────

describe('ActivityPanel — Properties reachable after adaptation', () => {
  it('Properties section is not collapsed after short-height adaptation', () => {
    const { container, restore } = renderUncontrolledWithFeature(720);
    try {
      expect(isSectionCollapsed(container, 'Properties')).toBe(false);
    } finally {
      restore();
    }
  });

  it('properties-form (or dispatch) is rendered in the DOM', () => {
    const restore = stubClientHeight(720);
    render(
      <ActivityPanel
        timeUiState="empty"
        selectedFeatureIds={['track-1']}
      />,
    );
    restore();
    // The Properties section renders PropertiesPanelDispatch which emits
    // data-testid="properties-panel-dispatch" or data-testid="properties-form"
    const dispatch = document.querySelector('[data-testid="properties-panel-dispatch"]');
    const form = document.querySelector('[data-testid="properties-form"]');
    expect(dispatch ?? form).not.toBeNull();
  });

  it('Properties section is in the DOM (discoverable)', () => {
    const { container, restore } = renderUncontrolledWithFeature(720);
    try {
      const propertiesTitle = Array.from(
        container.querySelectorAll('.debrief-activity-panel__section-title'),
      ).find((el) => el.textContent === 'Properties');
      expect(propertiesTitle).toBeTruthy();
    } finally {
      restore();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// selection prop alternative (T021 — also fires when `selection` prop used)
// ─────────────────────────────────────────────────────────────────────────────

describe('ActivityPanel — adaptation via selection prop', () => {
  it('collapses the Time Controller when selection.featureIds is non-empty (short height)', () => {
    const restore = stubClientHeight(700);
    const { container } = render(
      <ActivityPanel
        timeUiState="empty"
        selectedFeatureIds={[]}
        selection={{ featureIds: ['track-1'], primary: 'track-1' }}
      />,
    );
    restore();
    expect(isSectionCollapsed(container, 'Time Controller')).toBe(true);
    // Tools and Layers stay visible
    expect(isSectionCollapsed(container, 'Tools')).toBe(false);
    expect(isSectionCollapsed(container, 'Layers')).toBe(false);
  });

  it('is a no-op when selection.featureIds is empty (short height)', () => {
    const restore = stubClientHeight(700);
    const { container } = render(
      <ActivityPanel
        timeUiState="empty"
        selectedFeatureIds={[]}
        selection={{ featureIds: [], primary: null }}
      />,
    );
    restore();
    expect(isSectionCollapsed(container, 'Time Controller')).toBe(false);
  });
});

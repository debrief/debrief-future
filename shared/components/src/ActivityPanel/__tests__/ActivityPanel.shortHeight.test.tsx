/**
 * Unit tests for the short-viewport layout contract in ActivityPanel —
 * spec 281 T019 / US4 / FR-012.
 *
 * Resolution: the activity column SCROLLS when its sections don't all fit
 * (the ~487px GoldenLayout sidebar at 1280x720). No section is auto-collapsed
 * — an earlier attempt auto-collapsed the Time Controller, but that hides the
 * viewport/playback controls the storyboard-capture flow requires to stay
 * visible (spec #264/#273), and it deadlocked first-selection (the feature
 * list was too short to click before a selection could be made). Instead:
 *   - The Time Controller is a fixed-height section pinned `sticky` at the top
 *     (controls always reachable at any scroll offset; otherwise it scrolls up
 *     under the app header and the storyboard-capture occlusion invariant fails).
 *   - Tools/Layers keep a CSS min-height and scroll internally.
 *   - Properties + the feature list are reached by scrolling the column.
 *
 * These tests assert the JS contract (nothing is auto-collapsed at short
 * height; the Time Controller carries the sticky modifier; controlled state is
 * still honoured). The scroll geometry itself is exercised by the web-shell
 * Playwright suite (ui-review-layout SC-005) since jsdom has no layout engine.
 *
 * Decisions:
 *   #2  — only honours controlled collapseState; never calls onCollapseStateChange
 *   #13 — no mount-time clientHeight probe remains
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
 * a test. Returns a restore function. (Retained so tests can simulate a short
 * panel even though no JS now branches on it — guards against a regression
 * that re-introduces a height-based auto-collapse.)
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

/** Get the section element by its title text. */
function sectionByTitle(container: HTMLElement, title: string): Element {
  const sectionTitle = Array.from(
    container.querySelectorAll('.debrief-activity-panel__section-title'),
  ).find((el) => el.textContent === title);
  if (!sectionTitle) throw new Error(`Section "${title}" not found`);
  const section = sectionTitle.closest('.debrief-activity-panel__section');
  if (!section) throw new Error(`No section element for "${title}"`);
  return section;
}

/** Get the collapsed/expanded state of a section by its title text. */
function isSectionCollapsed(container: HTMLElement, title: string): boolean {
  return sectionByTitle(container, title).classList.contains(
    'debrief-activity-panel__section--collapsed',
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Short viewport: the column scrolls; NO section is auto-collapsed
// ─────────────────────────────────────────────────────────────────────────────

describe('ActivityPanel — short-viewport layout (scrolling column, no auto-collapse)', () => {
  it('does NOT auto-collapse the Time Controller at a short height', () => {
    // Regression guard: the storyboard-capture invariant (spec #264/#273)
    // needs the viewport controls visible, and first-selection needs the
    // feature list clickable — so the Time Controller must stay open.
    const { container, restore } = renderUncontrolledWithFeature(700);
    try {
      expect(isSectionCollapsed(container, 'Time Controller')).toBe(false);
    } finally {
      restore();
    }
  });

  it('does NOT auto-collapse the Time Controller even with no feature selected', () => {
    const restore = stubClientHeight(700);
    const { container } = render(<ActivityPanel timeUiState="empty" selectedFeatureIds={[]} />);
    restore();
    expect(isSectionCollapsed(container, 'Time Controller')).toBe(false);
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

  it('pins the Time Controller sticky so its controls stay reachable while scrolling', () => {
    const { container, restore } = renderUncontrolledWithFeature(700);
    try {
      const timeController = sectionByTitle(container, 'Time Controller');
      // Fixed height — never flexible (so it is never squeezed below its content).
      expect(
        timeController.classList.contains(
          'debrief-activity-panel__section--flexible',
        ),
      ).toBe(false);
      // Sticky — otherwise it scrolls up under the app header during the
      // storyboard-capture flow and the occlusion invariant fails.
      expect(
        timeController.classList.contains(
          'debrief-activity-panel__section--sticky',
        ),
      ).toBe(true);
    } finally {
      restore();
    }
  });

  it('NEVER calls onCollapseStateChange during render', () => {
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
// Controlled mode: explicit collapseState is honoured verbatim
// ─────────────────────────────────────────────────────────────────────────────

describe('ActivityPanel — controlled collapse state', () => {
  it('honours a controlled collapseState and does not override it', () => {
    const controlledState: ActivityPanelCollapseState = {
      timeControllerCollapsed: true,
      toolsCollapsed: true,
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
    // Controlled state is reflected verbatim.
    expect(isSectionCollapsed(container, 'Time Controller')).toBe(true);
    expect(isSectionCollapsed(container, 'Tools')).toBe(true);
    expect(isSectionCollapsed(container, 'Layers')).toBe(false);
    // The spy must not have been called during render.
    expect(spy).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Properties is present and reachable (rendered, not collapsed by default)
// ─────────────────────────────────────────────────────────────────────────────

describe('ActivityPanel — Properties reachable at short viewport', () => {
  it('Properties section is not collapsed at a short height', () => {
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

/**
 * Top-level briefing renderer SPA.
 *
 * Boots in one of two flows:
 *   - With `inlineData` prop (Playwright tests inject fixtures directly).
 *   - Reading the three `<script type="application/json">` slots at boot,
 *     falling back to the local dev fixture when slots are empty.
 *
 * Renders the BriefingMap behind the active chrome (Minimal default,
 * Present when toggled). Surfaces error / empty / halted states per
 * `contracts/spa-loading.md` § Error & empty states.
 *
 * Story-mode query-param (T074-T075) — when the URL carries
 * `?story=transport-bar` or `?story=mode-toggle`, the App renders just
 * that component on a neutral backdrop for Playwright-based isolation
 * captures (the briefing renderer does not ship Storybook).
 */

import { type FC, useEffect, useMemo, useState } from 'react';
import { useBriefingStore } from './store';
import { bootBriefingRenderer } from './boot';
import { runBrowserProbes, UNSUPPORTED_BROWSER_BANNER } from './probes/browserProbes';
import { BriefingMap } from './components/BriefingMap';
import { MinimalChrome } from './components/MinimalChrome';
import { PresentChrome } from './components/PresentChrome';
import { TransportBar } from './components/TransportBar';
import { ModeToggle } from './components/ModeToggle';
import { PlaybackProvider } from './playback/PlaybackProvider';
import type { InlineData, SceneFeature, StoryboardFeature } from './types';

export interface AppProps {
  /** Optional override for Playwright tests — bypasses the inlined-JSON
   *  extraction step and the dev-fixture fallback. */
  inlineData?: InlineData & { storyboard: StoryboardFeature; scenes: readonly SceneFeature[] };
  /** When true, swallow the auto-fallback to dev fixture (used by tests
   *  that want to assert the empty-state surface). */
  disableDevFixture?: boolean;
}

export const App: FC<AppProps> = ({ inlineData, disableDevFixture = false }) => {
  const bootState = useBriefingStore((s) => s.bootState);
  const bootError = useBriefingStore((s) => s.bootError);
  const haltedReason = useBriefingStore((s) => s.haltedReason);
  const displayMode = useBriefingStore((s) => s.displayMode);
  const setBootState = useBriefingStore((s) => s.setBootState);

  const [probes] = useState(() => runBrowserProbes());

  // T074-T075 — query-param story-mode lets Playwright capture each
  // component in isolation. `?story=transport-bar|mode-toggle` swaps
  // the full SPA for a minimal canvas with the named component.
  const storyMode = useMemo<'transport-bar' | 'mode-toggle' | null>(() => {
    if (typeof window === 'undefined') return null;
    const param = new URLSearchParams(window.location.search).get('story');
    if (param === 'transport-bar' || param === 'mode-toggle') return param;
    return null;
  }, []);

  // Seed the store SYNCHRONOUSLY on first render via useState's lazy
  // initializer. If we did this in useEffect, `BriefingMap` would mount
  // first with empty scenes — picking the default center/zoom — and
  // Leaflet's subsequent flyTo would zoom out to "fit" the transition,
  // showing the whole continent before settling. Seeding before any
  // child mounts means `BriefingMap` reads the right Scene 0 viewport
  // on first paint.
  useState<void>(() => {
    if (typeof window === 'undefined') return;
    const result = bootBriefingRenderer(useBriefingStore.getState(), {
      inlineData,
      disableDevFixture,
    });
    if (result.kind === 'error') {
      setBootState('error', result.message);
    }
  });

  if (storyMode) {
    return <StoryCanvas story={storyMode} />;
  }

  if (bootState === 'loading') {
    return <FullViewportMessage testId="briefing-loading" title="Loading briefing…" />;
  }

  if (bootState === 'error') {
    return (
      <FullViewportMessage
        testId="briefing-error"
        title="Briefing data is unreadable"
        detail={bootError ?? 'Unknown error'}
      />
    );
  }

  if (bootState === 'halted') {
    return (
      <FullViewportMessage
        testId="briefing-halted"
        title="Playback halted"
        detail={
          haltedReason
            ? `${haltedReason.kind === 'adapter' ? haltedReason.adapter + ': ' : ''}${haltedReason.message}`
            : 'An adapter or tween rejected mid-playback.'
        }
      />
    );
  }

  if (bootState === 'empty') {
    return (
      <FullViewportMessage
        testId="briefing-empty"
        title="This Storyboard has no Scenes to play."
      />
    );
  }

  return (
    <PlaybackProvider>
      {!probes.userAgentSupported && (
        <div data-testid="briefing-browser-banner" style={browserBannerStyle}>
          {UNSUPPORTED_BROWSER_BANNER}
        </div>
      )}
      <BriefingMap />
      {displayMode === 'minimal' ? <MinimalChrome /> : <PresentChrome />}
    </PlaybackProvider>
  );
};

interface FullViewportMessageProps {
  testId: string;
  title: string;
  detail?: string;
}

const FullViewportMessage: FC<FullViewportMessageProps> = ({ testId, title, detail }) => {
  return (
    <div data-testid={testId} style={messageStyle}>
      <h1 style={{ fontSize: '1.25rem', margin: 0 }}>{title}</h1>
      {detail ? <p style={{ marginTop: '0.75rem' }}>{detail}</p> : null}
    </div>
  );
};

const messageStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '2rem',
  background: '#1e1e1e',
  color: '#f0f0f0',
};

const browserBannerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  background: '#5a3a00',
  color: '#fff7e6',
  padding: '0.5rem 1rem',
  fontSize: '0.85rem',
  textAlign: 'center',
};

interface StoryCanvasProps {
  story: 'transport-bar' | 'mode-toggle';
}

/**
 * Component-isolation canvas (T074-T075). Renders one of the briefing
 * components on a neutral backdrop so Playwright can capture it.
 *
 * Each story sets up a tiny fixture state in the store on mount.
 */
const StoryCanvas: FC<StoryCanvasProps> = ({ story }) => {
  useEffect(() => {
    const scenes = Array.from({ length: 4 }, (_, i) => ({
      type: 'Feature' as const,
      id: `S${i}`,
      geometry: { type: 'Polygon' as const, coordinates: [] },
      properties: {
        kind: 'STORYBOARD_SCENE',
        id: `S${i}`,
        storyboard_id: 'SB',
        title: `Scene ${i + 1}`,
        timestamp: new Date(Date.UTC(2025, 0, 15, 12, i * 5)).toISOString(),
        creation_order: i,
        viewport: { center: [0, 0], zoom: 6, bearing: 0 },
      },
    }));
    useBriefingStore.setState({
      bootState: 'ready',
      scenes: scenes as unknown as ReturnType<typeof useBriefingStore.getState>['scenes'],
      currentSceneIndex: 1,
      playState: 'paused',
      displayMode: 'minimal',
      modeToggleVisible: true,
    });
  }, []);

  return (
    <div data-testid="briefing-story-canvas" style={storyCanvasStyle}>
      <PlaybackProvider>
        <div style={storyCanvasInner}>
          {story === 'transport-bar' ? (
            <TransportBar />
          ) : (
            <ModeToggle />
          )}
        </div>
      </PlaybackProvider>
    </div>
  );
};

const storyCanvasStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: '#1e1e1e',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const storyCanvasInner: React.CSSProperties = {
  padding: '1.5rem',
  background: 'rgba(0, 0, 0, 0.4)',
  borderRadius: '8px',
};

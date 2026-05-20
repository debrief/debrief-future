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
 */

import { type FC, useEffect, useState } from 'react';
import { useBriefingStore } from './store';
import { loadInlineData, InlineDataLoadError } from './loaders/inlineDataLoader';
import { buildDevFixture } from './fixtures/dev-fixture';
import { runBrowserProbes, UNSUPPORTED_BROWSER_BANNER } from './probes/browserProbes';
import { BriefingMap } from './components/BriefingMap';
import { MinimalChrome } from './components/MinimalChrome';
import { PresentChrome } from './components/PresentChrome';
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
  const seed = useBriefingStore((s) => s.seed);
  const setBootState = useBriefingStore((s) => s.setBootState);

  const [probes] = useState(() => runBrowserProbes());

  useEffect(() => {
    if (inlineData) {
      seed({
        features: inlineData.features,
        item: inlineData.item,
        config: inlineData.config,
        scenes: inlineData.scenes,
      });
      return;
    }
    try {
      const loaded = loadInlineData();
      if (loaded) {
        seed({
          features: loaded.features,
          item: loaded.item,
          config: loaded.config,
          scenes: loaded.scenes,
        });
        return;
      }
      if (disableDevFixture) {
        setBootState('error', 'No briefing data found in inlined slots.');
        return;
      }
      // Empty slots → dev fixture (Vite dev server only).
      const fixture = buildDevFixture();
      seed({
        features: fixture.features,
        item: fixture.item,
        config: fixture.config,
        scenes: fixture.scenes,
      });
    } catch (e) {
      const msg =
        e instanceof InlineDataLoadError
          ? `Briefing data is unreadable: ${e.message}`
          : `Unexpected boot error: ${(e as Error).message}`;
      setBootState('error', msg);
    }
  }, [inlineData, disableDevFixture, seed, setBootState]);

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
    <>
      {!probes.userAgentSupported && (
        <div data-testid="briefing-browser-banner" style={browserBannerStyle}>
          {UNSUPPORTED_BROWSER_BANNER}
        </div>
      )}
      <BriefingMap />
      {displayMode === 'minimal' ? <MinimalChrome /> : <PresentChrome />}
    </>
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

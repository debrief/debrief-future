/**
 * Live `<StoryboardPanel>` mount for the web-shell Analysis view
 * (#235 — T045-T048).
 *
 * Replaces the fixture-driven `StoryboardEditHarness` on the default
 * Analysis-view path. Reads from the live `getSessionStore()` feature
 * collection (passed via props from `App.tsx`) and exposes the rail
 * next to the central area without overlapping it.
 *
 * Wires:
 *   - Capture button → `captureSceneWeb`
 *   - Naming row + collision banner → `WebPanelHost` (mirrors the
 *     VS Code postMessage channel)
 *   - Maintenance ops → #215 CRUD module (Phase 4 wires these; this
 *     mount renders the panel against live state today)
 *   - FR-WEB-029a session-only badge — visible whenever any
 *     captured-but-unpersisted Storyboard or Scene Feature exists in
 *     the store (web-shell has no STAC write path yet — see #236).
 *   - Ctrl/Cmd+Alt+C keyboard shortcut (suppressed when an editable
 *     element is focused).
 *   - `pagehide` listener that aborts any in-flight capture.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import type { Feature, FeatureCollection } from 'geojson';
import {
  StoryboardPanel,
  composeSceneEditViewModels,
  detectSceneOverlaps,
  overlapPairKey,
  formatDtg,
  isSceneFeature,
  isStoryboardFeature,
  getActiveStoryboardDefault,
  useStoryboardEditReducer,
  type SceneRowViewModel,
  type SceneEditViewModel,
  type StoryboardOptionViewModel,
  type StoryboardPlot,
} from '@debrief/components';
import {
  persistActiveStoryboardId,
  readPersistedActiveStoryboardId,
} from './services/activeStoryboardPersistence';
import type { SessionStoreApi } from '@debrief/session-state';
import {
  captureSceneWeb,
  __abortCaptureInFlight,
} from './commands/captureSceneWeb';
import {
  previewStoryboardWeb,
  PreviewBlockedError,
} from './commands/previewStoryboardWeb';
import { WebPanelHost } from './services/webPanelHost';
import { getSceneThumbnailStore } from './services/webSceneThumbnailAdapter';
import { createStoryboardHandlers } from './handlers/storyboardHandlers';
import {
  getActiveCapability,
  subscribeStacWriter,
} from './services/stacWriterRegistry';

type StoryboardPlotFeature = StoryboardPlot['features'][number];

export interface StoryboardPanelMountProps {
  /** The live session-state store. Used for viewport / time / dirty state. */
  readonly sessionStore: SessionStoreApi;
  /** The current FeatureCollection (from React state via App.tsx). */
  readonly featureCollection: FeatureCollection;
  /** Push a new FeatureCollection back into App.tsx state after a CRUD op. */
  readonly setFeatureCollection: (fc: FeatureCollection) => void;
  /** Resolves the live `.leaflet-container` element for thumbnail capture. */
  readonly getMapContainer: () => HTMLElement | null;
  /** Actor identity recorded in provenance entries. */
  readonly actor?: string;
}

function packagePlot(features: readonly Feature[]): StoryboardPlot {
  return {
    type: 'FeatureCollection',
    // eslint-disable-next-line no-restricted-syntax -- #235 web-shell mirror of #216 ADR-019.
    features: features as unknown as StoryboardPlotFeature[],
  };
}

function computeSceneRows(
  fc: FeatureCollection,
  activeStoryboardId: string | null,
): SceneRowViewModel[] {
  if (activeStoryboardId === null) return [];
  const rows: SceneRowViewModel[] = [];
  const thumbnailStore = getSceneThumbnailStore();
  for (const f of fc.features) {
    // eslint-disable-next-line no-restricted-syntax -- #235 web-shell mirror of #216 ADR-019.
    const sceneTest = f as unknown as Parameters<typeof isSceneFeature>[0];
    if (!isSceneFeature(sceneTest)) continue;
    if (sceneTest.properties.storyboard_id !== activeStoryboardId) continue;
    const thumb = thumbnailStore.get(sceneTest.properties.id);
    rows.push({
      sceneId: sceneTest.properties.id,
      title: sceneTest.properties.title,
      timestampIso: sceneTest.properties.timestamp,
      dtgLabel: formatDtg(sceneTest.properties.timestamp),
      thumbnailHref: thumb?.smallDataUrl ?? '',
      state: { kind: 'ok' as const },
    });
  }
  rows.sort((a, b) =>
    a.timestampIso < b.timestampIso ? -1 : a.timestampIso > b.timestampIso ? 1 : 0,
  );
  return rows;
}

function computeStoryboardOptions(
  fc: FeatureCollection,
): StoryboardOptionViewModel[] {
  const opts: StoryboardOptionViewModel[] = [];
  // Compute scene counts up front.
  const sceneCounts = new Map<string, number>();
  for (const f of fc.features) {
    // eslint-disable-next-line no-restricted-syntax -- #235 web-shell mirror of #216 ADR-019.
    const sceneTest = f as unknown as Parameters<typeof isSceneFeature>[0];
    if (!isSceneFeature(sceneTest)) continue;
    const sid = sceneTest.properties.storyboard_id;
    sceneCounts.set(sid, (sceneCounts.get(sid) ?? 0) + 1);
  }
  for (const f of fc.features) {
    // eslint-disable-next-line no-restricted-syntax -- #235 web-shell mirror of #216 ADR-019.
    const sbTest = f as unknown as Parameters<typeof isStoryboardFeature>[0];
    if (!isStoryboardFeature(sbTest)) continue;
    const id = sbTest.properties.id;
    const provenance = sbTest.properties.provenance;
    const lastEntry =
      Array.isArray(provenance) && provenance.length > 0
        ? provenance[provenance.length - 1]
        : null;
    const lastModifiedIso =
      lastEntry !== null && typeof lastEntry === 'object' && 'at' in lastEntry
        ? String((lastEntry as { at: unknown }).at)
        : '';
    opts.push({
      storyboardId: id,
      name: sbTest.properties.name,
      sceneCount: sceneCounts.get(id) ?? 0,
      lastModifiedIso,
    });
  }
  return opts;
}

export function StoryboardPanelMount({
  sessionStore,
  featureCollection,
  setFeatureCollection,
  getMapContainer,
  actor = 'web-shell-user',
}: StoryboardPanelMountProps): React.ReactElement {
  // ─── Web panel host (singleton per mount) ────────────────────────
  const hostRef = useRef<WebPanelHost | null>(null);
  if (hostRef.current === null) {
    hostRef.current = new WebPanelHost();
  }
  const host = hostRef.current;

  // Subscribe to host snapshot for namingRow / collisionBanner pushes.
  const hostSnapshot = useSyncExternalStore(
    useCallback(
      (listener: () => void) => host.subscribe(listener),
      [host],
    ),
    useCallback(() => host.getSnapshot(), [host]),
    useCallback(() => host.getSnapshot(), [host]),
  );

  // Subscribe to thumbnail store so the rail re-renders when a capture
  // completes (the thumbnailHref otherwise stays stale).
  const thumbnailStore = useMemo(() => getSceneThumbnailStore(), []);
  const thumbnailRevision = useSyncExternalStore(
    useCallback(
      (listener: () => void) => thumbnailStore.subscribe(listener),
      [thumbnailStore],
    ),
    useCallback((): boolean => thumbnailStore.hasAny(), [thumbnailStore]),
    useCallback((): boolean => thumbnailStore.hasAny(), [thumbnailStore]),
  );

  // ─── Derive view-models from the live FeatureCollection ──────────
  const plot = useMemo(() => packagePlot(featureCollection.features), [
    featureCollection,
  ]);
  // Active-Storyboard selection is panel-local: defaults to the
  // most-recently-modified Storyboard (#215's getActiveStoryboardDefault),
  // can be overridden by clicking a different one in the header dropdown.
  // Reset to null when the override no longer exists in the plot.
  //
  // #237 — initial state seeds from the persisted SystemState feature in the
  // plot, so a previously-pinned Storyboard re-opens with that selection
  // instead of always falling back to getActiveStoryboardDefault.
  const [activeOverrideId, setActiveOverrideId] = React.useState<
    string | null
  >(() => readPersistedActiveStoryboardId(featureCollection).id);
  // #237 — re-read when the plot changes (different document opened); also
  // self-heals stale entries on open by writing the chosen fallback back
  // through the edit pipeline (FR-007).
  const lastSeenFcRef = useRef<FeatureCollection | null>(null);
  useEffect(() => {
    if (lastSeenFcRef.current === featureCollection) return;
    lastSeenFcRef.current = featureCollection;
    const verdict = readPersistedActiveStoryboardId(featureCollection);
    if (verdict.kind === 'valid') {
      setActiveOverrideId(verdict.id);
      return;
    }
    if (verdict.kind === 'absent') {
      setActiveOverrideId(null);
      return;
    }
    // 'stale' — pick the default Storyboard and self-heal the SystemState.
    const fallback = getActiveStoryboardDefault(packagePlot(featureCollection.features));
    const fallbackId = fallback?.properties.id ?? null;
    setActiveOverrideId(null);
    persistActiveStoryboardId(featureCollection, fallbackId, setFeatureCollection);
  }, [featureCollection, setFeatureCollection]);
  const activeStoryboard = useMemo(() => {
    if (activeOverrideId !== null) {
      const overridden = plot.features.find((f) => {
        const props = f.properties as { id?: string; kind?: string } | null;
        return (
          props !== null &&
          props.kind === 'STORYBOARD' &&
          props.id === activeOverrideId
        );
      });
      if (overridden !== undefined) {
        // eslint-disable-next-line no-restricted-syntax -- #235 web-shell mirror of #216 ADR-019.
        return overridden as unknown as ReturnType<
          typeof getActiveStoryboardDefault
        >;
      }
    }
    return getActiveStoryboardDefault(plot);
  }, [plot, activeOverrideId]);
  const activeStoryboardId = activeStoryboard?.properties.id ?? null;
  const activeStoryboardName = activeStoryboard?.properties.name ?? null;
  // Drop a stale override when the underlying storyboard is gone.
  useEffect(() => {
    if (activeOverrideId !== null && activeStoryboardId !== activeOverrideId) {
      setActiveOverrideId(null);
    }
  }, [activeOverrideId, activeStoryboardId]);
  const sceneRows = useMemo(
    () => {
      void thumbnailRevision; // re-compute when the store changes
      return computeSceneRows(featureCollection, activeStoryboardId);
    },
    [featureCollection, activeStoryboardId, thumbnailRevision],
  );
  const storyboardOptions = useMemo(
    () => computeStoryboardOptions(featureCollection),
    [featureCollection],
  );

  // ─── Reducer (panel-local state) ─────────────────────────────────
  const {
    state,
    dispatch,
    namingRowViewModel,
    collisionBannerViewModel,
    setNamingRowPendingName,
  } = useStoryboardEditReducer();

  // Push host snapshots + derived view-models into the reducer whenever
  // they change. Mirrors the VS Code panelView's `refresh()` /
  // `applySnapshot()` behaviour.
  useEffect(() => {
    dispatch({
      type: 'scenes-message',
      payload: {
        scenes: sceneRows,
        activeStoryboardName,
        activeStoryboardId,
        namingRow: hostSnapshot.namingRow,
        collisionBanner: hostSnapshot.collisionBanner,
      },
    });
  }, [
    dispatch,
    sceneRows,
    activeStoryboardName,
    activeStoryboardId,
    hostSnapshot.namingRow,
    hostSnapshot.collisionBanner,
  ]);

  const baseSceneEditViewModels = useMemo(
    () => composeSceneEditViewModels(state),
    [state],
  );

  // ─── #271 — time-range overlap warnings ──────────────────────────────
  // Session-scoped, un-persisted set of dismissed overlap pair keys.
  const [dismissedOverlapPairs, setDismissedOverlapPairs] = React.useState<
    ReadonlySet<string>
  >(() => new Set());

  const overlapsByScene = useMemo(
    () =>
      activeStoryboardId !== null
        ? detectSceneOverlaps(plot, activeStoryboardId, dismissedOverlapPairs)
        : new Map<string, readonly { sceneId: string; title: string }[]>(),
    [plot, activeStoryboardId, dismissedOverlapPairs],
  );

  // Prune dismissed keys that no longer correspond to an active overlap, so a
  // pair pulled apart and later re-overlapped warns afresh (FR-009 / C4.4).
  useEffect(() => {
    if (dismissedOverlapPairs.size === 0) return;
    const activePairs = new Set<string>();
    if (activeStoryboardId !== null) {
      for (const [sceneId, partners] of detectSceneOverlaps(
        plot,
        activeStoryboardId,
      )) {
        for (const partner of partners) {
          activePairs.add(overlapPairKey(sceneId, partner.sceneId));
        }
      }
    }
    let changed = false;
    const next = new Set<string>();
    for (const key of dismissedOverlapPairs) {
      if (activePairs.has(key)) next.add(key);
      else changed = true;
    }
    if (changed) setDismissedOverlapPairs(next);
  }, [plot, activeStoryboardId, dismissedOverlapPairs]);

  const sceneEditViewModels = useMemo(() => {
    const merged: Record<string, SceneEditViewModel> = {};
    for (const [id, vm] of Object.entries(baseSceneEditViewModels)) {
      merged[id] = { ...vm, overlapsWith: overlapsByScene.get(id) ?? [] };
    }
    return merged;
  }, [baseSceneEditViewModels, overlapsByScene]);

  const handleOverlapDismiss = useCallback(
    (_sceneId: string, partnerSceneIds: readonly string[]) => {
      setDismissedOverlapPairs((prev) => {
        const next = new Set(prev);
        for (const partnerId of partnerSceneIds) {
          next.add(overlapPairKey(_sceneId, partnerId));
        }
        return next;
      });
    },
    [],
  );

  // ─── Scene-row click handler — Spec #258 ───────────────────────────
  // When the user clicks a scene in the panel, restore its captured
  // display mode alongside any future flyTo wiring (FR-002, FR-003).
  // Legacy scenes (no display_mode) leave the time controller untouched.
  const handleSceneRowClick = useCallback(
    (sceneId: string) => {
      for (const f of featureCollection.features) {
        // eslint-disable-next-line no-restricted-syntax -- #258 GeoJSON Feature ↔ PlotFeature boundary; mirrors the existing pattern at packagePlot().
        const sceneTest = f as unknown as Parameters<typeof isSceneFeature>[0];
        if (!isSceneFeature(sceneTest)) continue;
        if (sceneTest.properties.id !== sceneId) continue;
        const mode = sceneTest.properties.display_mode;
        if (mode === 'full' || mode === 'trail') {
          sessionStore.getState().setDisplayMode(mode);
        }
        return;
      }
    },
    [featureCollection, sessionStore],
  );

  // ─── Capture handler ─────────────────────────────────────────────
  const handleCaptureClick = useCallback(() => {
    void captureSceneWeb(
      {
        sessionStore,
        getFeatureCollection: () => featureCollection,
        setFeatureCollection,
        getMapContainer,
        panelView: host,
        actor,
        trigger: { source: 'panelButton' },
      },
    );
  }, [
    sessionStore,
    featureCollection,
    setFeatureCollection,
    getMapContainer,
    host,
    actor,
  ]);

  // Spec 260 — viewport lock state via Zustand subscription, mirroring the
  // pattern used elsewhere in this file (`useSyncExternalStore` against the
  // store's `subscribe` + `getState` pair).
  const viewportLocked = useSyncExternalStore(
    sessionStore.subscribe,
    () => sessionStore.getState().viewportLocked,
  );
  const handleViewportLockToggle = useCallback(() => {
    const current = sessionStore.getState().viewportLocked;
    sessionStore.getState().setViewportLocked(!current);
  }, [sessionStore]);

  // ─── #273 live Preview ───────────────────────────────────────────
  // Open the briefing renderer in a new tab, loaded live from the active
  // storyboard's scoped features via a same-origin blob URL. A named tab
  // target reuses a single preview window across clicks (spec A-3).
  const handlePreview = useCallback(() => {
    if (activeStoryboardId === null) return;
    try {
      previewStoryboardWeb(plot, activeStoryboardId, {
        createObjectUrl: (blob) => URL.createObjectURL(blob),
        revokeObjectUrl: (url) => URL.revokeObjectURL(url),
        openWindow: (url) => window.open(url, 'debrief-briefing-preview'),
        rendererBaseUrl: `${import.meta.env.BASE_URL}briefing-renderer/`,
      });
    } catch (err) {
      if (err instanceof PreviewBlockedError) {
        // eslint-disable-next-line no-alert -- transient author-facing notice; web-shell has no toast surface yet.
        window.alert(err.message);
        return;
      }
      console.error('[StoryboardPanelMount] preview failed:', err);
    }
  }, [plot, activeStoryboardId]);

  // ─── Naming row handlers ─────────────────────────────────────────
  const onNamingRowTextChanged = useCallback(
    (pendingName: string) => setNamingRowPendingName(pendingName),
    [setNamingRowPendingName],
  );
  const onNamingRowConfirm = useCallback(() => {
    const slice = state.namingRow;
    if (slice === null || !slice.visible) return;
    host.onNamingRowConfirm(slice.pendingName.trim());
  }, [state.namingRow, host]);
  const onNamingRowCancel = useCallback(() => {
    host.onNamingRowCancel();
  }, [host]);

  // ─── Collision banner handlers ───────────────────────────────────
  const onCollisionReplace = useCallback(
    (conflictingSceneId: string) => {
      host.onCollisionReplace(conflictingSceneId);
    },
    [host],
  );
  const onCollisionOffset = useCallback(() => {
    host.onCollisionOffset();
  }, [host]);
  const onCollisionCancel = useCallback(() => {
    host.onCollisionCancel();
  }, [host]);

  // ─── Storyboard-level handlers (T068, T071) ──────────────────────
  // T071 — switch active Storyboard (panel-local override).
  // #237 — persist the override into the plot's FeatureCollection via the
  // existing edit pipeline so the choice survives close/reopen.
  const onActiveStoryboardChange = useCallback(
    (storyboardId: string) => {
      setActiveOverrideId(storyboardId);
      persistActiveStoryboardId(
        featureCollection,
        storyboardId,
        setFeatureCollection,
      );
    },
    [featureCollection, setFeatureCollection],
  );

  // T068 — create new Storyboard via overflow menu reuses the inline
  // naming row that capture uses.
  const onCreateStoryboard = useCallback(() => {
    void (async (): Promise<void> => {
      const knownNames: string[] = [];
      for (const f of featureCollection.features) {
        const props = f.properties as { kind?: string; name?: string } | null;
        if (
          props !== null &&
          props.kind === 'STORYBOARD' &&
          typeof props.name === 'string'
        ) {
          knownNames.push(props.name);
        }
      }
      const reply = await host.promptStoryboardName({
        defaultName: `Storyboard ${knownNames.length + 1}`,
        knownNames,
      });
      if (reply === null || reply.name.trim() === '') return;
      // Inline import to keep the call-site readable; the CRUD call
      // is the only async work here.
      const { createStoryboard } = await import('@debrief/components');
      const fcLatest = packagePlot(featureCollection.features);
      try {
        const result = await createStoryboard(fcLatest, {
          name: reply.name.trim(),
          actor,
        });
        const newId = result.storyboard.properties.id;
        // #237 — persist the new Storyboard as the active selection
        // alongside the create write, in a single edit-pipeline call.
        const fcAfterCreate: FeatureCollection = {
          type: 'FeatureCollection',
          // eslint-disable-next-line no-restricted-syntax -- #235 web-shell mirror of #216 ADR-019.
          features: result.plot.features as unknown as Feature[],
        };
        persistActiveStoryboardId(fcAfterCreate, newId, setFeatureCollection);
        setActiveOverrideId(newId);
        sessionStore.getState().markDirty();
      } catch (err) {
        console.error('[StoryboardPanelMount] createStoryboard failed:', err);
      }
    })();
  }, [host, featureCollection, setFeatureCollection, sessionStore, actor]);

  // ─── Keyboard shortcut: Ctrl/Cmd+Alt+C ───────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (!e.altKey) return;
      if (e.key.toLowerCase() !== 'c') return;
      // Suppress when typing in an editable field.
      const t = e.target as HTMLElement | null;
      if (t !== null) {
        const tag = t.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (t.isContentEditable) return;
      }
      e.preventDefault();
      handleCaptureClick();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleCaptureClick]);

  // ─── Pagehide cleanup (T044) ─────────────────────────────────────
  useEffect(() => {
    const onPageHide = (): void => {
      __abortCaptureInFlight();
      host.reset();
    };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
    };
  }, [host]);

  // ─── FR-WEB-029a session-only badge ──────────────────────────────
  // #236 — gate the badge on the StacWriter's capability report.
  // available: true   → captures persist via IndexedDB; badge hidden.
  // available: false  → badge stays visible, with a `reason`-specific
  //                     message explaining why persistence is unavailable.
  const capability = useSyncExternalStore(
    useCallback((listener: () => void) => subscribeStacWriter(listener), []),
    () => getActiveCapability(),
    () => getActiveCapability(),
  );
  const hasStoryboardContent = useMemo(() => {
    for (const f of featureCollection.features) {
      const props = f.properties as { kind?: string } | null;
      if (props === null) continue;
      if (props.kind === 'STORYBOARD' || props.kind === 'STORYBOARD_SCENE') {
        return true;
      }
    }
    return false;
  }, [featureCollection]);
  const hasSessionOnlyContent = !capability.available && hasStoryboardContent;
  const badgeMessage =
    capability.reason === 'quota'
      ? 'Browser storage is full — captures will not persist. Clear unused captures or export.'
      : capability.reason === 'denied'
      ? 'Browser blocked persistence — captures will not survive reload. Try a non-private window.'
      : capability.reason === 'idb-version-mismatch'
      ? 'Database version mismatch — captures will not persist. Reload to retry.'
      : '⚠ Session-only — captures persist only for this tab. Browser persistence unavailable.';

  // ─── Wired maintenance handlers (Phase 4 + Phase 5) ──────────────
  const handlers = useMemo(
    () =>
      createStoryboardHandlers({
        sessionStore,
        getFeatureCollection: () => featureCollection,
        setFeatureCollection,
        getMapContainer,
        panelView: host,
        actor,
        notify: (msg) => {
          // Phase 4 follow-up: route through a proper status toast.
          // For now, console.info so the message is at least discoverable.
          console.info(`[Storyboard] ${msg}`);
        },
        logError: (line) => console.error(line),
      }),
    [
      sessionStore,
      featureCollection,
      setFeatureCollection,
      getMapContainer,
      host,
      actor,
    ],
  );

  // Ops still deferred to a follow-up PR (require additional UI):
  //   - update-to-current (re-capture viewport + timestamp + thumbnail)
  //   - duplicate (needs inline timestamp picker)
  //   - copy-to-other-storyboard (needs inline storyboard picker)
  //   - create-storyboard via overflow menu (reuses naming row)
  //   - rename-storyboard via header dropdown (inline form)
  //   - active-storyboard switching (needs panel-local state lift)
  // These render as no-op stubs that console.warn for visibility.
  const noopWithLog = useCallback(
    (op: string) =>
      (..._args: unknown[]): void => {
        console.warn(
          `[StoryboardPanelMount] ${op} — deferred follow-up. ` +
            `See specs/235-storyboard-capture-ux/tasks.md.`,
        );
      },
    [],
  );

  return (
    <div
      data-testid="storyboard-panel-mount"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      {hasSessionOnlyContent && (
        <div
          data-testid="storyboard-session-only-badge"
          role="status"
          style={{
            padding: '4px 10px',
            fontSize: 11,
            background:
              'var(--vscode-editorWarning-background, rgba(255, 197, 61, 0.15))',
            color:
              'var(--vscode-editorWarning-foreground, #bf8803)',
            borderBottom:
              '1px solid var(--vscode-panel-border, #3c3c3c)',
          }}
        >
          {badgeMessage}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        <StoryboardPanel
          scenes={sceneRows}
          activeStoryboardName={activeStoryboardName}
          captureInFlight={state.captureInFlight}
          onCaptureClick={handleCaptureClick}
          onSceneRowClick={handleSceneRowClick}
          // Spec 260 — viewport lock padlock in the panel header.
          viewportLocked={viewportLocked}
          onViewportLockToggle={handleViewportLockToggle}
          hasActivePlot={true}
          // #273 — live Preview (disabled when the active storyboard is empty).
          onPreview={handlePreview}
          canPreview={activeStoryboardId !== null && sceneRows.length > 0}
          storyboards={
            storyboardOptions.length > 0 ? storyboardOptions : undefined
          }
          activeStoryboardId={activeStoryboardId}
          currentSceneId={state.currentSceneId}
          transport={state.transport}
          onActiveStoryboardChange={onActiveStoryboardChange}
          onCreateStoryboard={onCreateStoryboard}
          onRenameStoryboard={noopWithLog('onRenameStoryboard')}
          onDeleteStoryboard={(): void => {
            if (activeStoryboardId !== null) {
              handlers.onDeleteStoryboard(activeStoryboardId);
            }
          }}
          sceneEditViewModels={sceneEditViewModels}
          // Phase 4 wired handlers — direct CRUD calls against the live
          // FeatureCollection. The panel-local edit-form lifecycle
          // (open/close) lives in the reducer; these props are the
          // commit callbacks invoked when the user confirms.
          onSceneTitleRenameCommit={handlers.onSceneTitleRenameCommit}
          onSceneDescriptionSubmit={handlers.onSceneDescriptionSubmit}
          onSceneDeleteRequested={handlers.onSceneDeleteRequested}
          onSceneUndoDeleteClicked={handlers.onSceneUndoDeleteClicked}
          onSceneRefreshThumbnailClicked={
            handlers.onSceneRefreshThumbnailClicked
          }
          onStoryboardNameRenameCommit={handlers.onStoryboardNameRenameCommit}
          onStoryboardDescriptionSubmit={
            handlers.onStoryboardDescriptionSubmit
          }
          onSceneUpdateToCurrentClicked={
            handlers.onSceneUpdateToCurrentClicked
          }
          // Still deferred (need additional UI):
          onSceneDuplicateClicked={noopWithLog('onSceneDuplicateClicked')}
          onSceneCopyToOtherClicked={noopWithLog(
            'onSceneCopyToOtherClicked',
          )}
          onStoryboardRefreshAllStaleClicked={noopWithLog(
            'onStoryboardRefreshAllStaleClicked',
          )}
          namingRowViewModel={namingRowViewModel}
          collisionBannerViewModel={collisionBannerViewModel}
          onNamingRowTextChanged={onNamingRowTextChanged}
          onNamingRowConfirm={onNamingRowConfirm}
          onNamingRowCancel={onNamingRowCancel}
          onCollisionReplace={onCollisionReplace}
          onCollisionOffset={onCollisionOffset}
          onCollisionCancel={onCollisionCancel}
          onSceneOverlapDismiss={handleOverlapDismiss}
        />
      </div>
    </div>
  );
}

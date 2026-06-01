/**
 * Open Plot Command - Open a plot from a STAC store
 */

import * as vscode from 'vscode';
import { readFile } from 'fs/promises';
import { createLogService, createSnapshotService, createTimeInstant, type ResultIdRegistry, type StacAssetForHydration } from '@debrief/session-state';
import { hydrateStoreFromFeatures, SystemStateLoadError, type PlayheadClampDiagnostic } from '../services/systemStateBridge';
import { notifyPlayheadClamps } from '../services/playheadClampNotice';
import type { StacWriter } from '@debrief/stac-writer';
import type { ConfigService } from '../services/configService';
import type { StacService } from '../services/stacService';
import type { CalcService } from '../services/calcService';
import type { IoService } from '../services/ioService';
import type { RecentPlotsService } from '../services/recentPlotsService';
import type { OpenPlotsService } from '../services/openPlotsService';
import type { SessionManager } from '../services/sessionManager';
import type { ToolsTreeProvider } from '../providers/toolsTreeProvider';
import type { ToolMatchAdapter } from '../services/toolMatchAdapter';
import type { LayersTreeProvider } from '../providers/layersTreeProvider';
import type { TimeRangeViewProvider } from '../views/timeRangeView';
import type { ActivityPanelViewProvider } from '../views/activityPanelView';
import type { LogPanelViewProvider } from '../views/logPanelView';
import { MapPanel } from '../webview/mapPanel';
import { isTrackFeature, isReferenceLocation } from '@debrief/components';
import type { DebriefFeature } from '@debrief/components';
import { parseStacUri, buildStacUri } from '../types/stac';
import type { IngressFeature, IngressFeatureCollection } from '@debrief/schemas';

/** Extract a display name from a DebriefFeature. Uses type-specific property names. */
function featureDisplayName(f: DebriefFeature): string {
  if (isTrackFeature(f)) {
    return f.properties.platform_name ?? f.properties.platform_id ?? String(f.id);
  }
  if (isReferenceLocation(f)) {
    return f.properties.name ?? String(f.id);
  }
  // Annotation types — use 'label' or fall back to id
  const props = f.properties as { label?: string; name?: string; text?: string };
  return props.label ?? props.name ?? props.text ?? String(f.id);
}

/** Adapt an IngressFeature to a loosely-typed record for session-state log service. */
function safeFeatureToRecord(f: IngressFeature): Record<string, unknown> {
  return { type: f.type, id: f.id, geometry: f.geometry, properties: f.properties };
}

/**
 * Adapt a GeoJsonFeatureCollection (session-state type) to IngressFeatureCollection
 * (stacService type). The shapes are structurally equivalent; geometry:unknown
 * narrows to the schema-derived ingress geometry (which admits null for SYSTEM /
 * storyboard features) via assertion on each feature.
 */
function toIngressFC(fc: { type: string; features: Array<{ type: string; geometry: unknown; properties: Record<string, unknown> | null; id?: string | number }> }): IngressFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f): IngressFeature => ({
      type: 'Feature',
      id: f.id,
      geometry: f.geometry as IngressFeature['geometry'],
      properties: f.properties,
    })),
  };
}

/** Minimal session-state GeoJSON feature shape (matches `@debrief/session-state`
 *  `GeoJsonFeature`): geometry erased to `unknown`, properties required-nullable. */
type SessionGeoJsonFC = {
  type: 'FeatureCollection';
  features: Array<{ type: 'Feature'; geometry: unknown; properties: Record<string, unknown> | null; id?: string | number }>;
};

/** Adapt an IngressFeatureCollection (geometry may be null, properties optional)
 *  back to the session-state GeoJsonFeatureCollection shape. The only structural
 *  gap is `properties`, which the schema-derived type leaves optional
 *  (`Record | null | undefined`) but session-state requires as `Record | null`. */
function toGeoJsonFC(fc: IngressFeatureCollection | null): SessionGeoJsonFC | null {
  if (!fc) { return null; }
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f) => ({
      type: 'Feature' as const,
      geometry: f.geometry,
      properties: f.properties ?? null,
      id: f.id,
    })),
  };
}


interface OpenPlotArgs {
  uri?: string;
}

interface PlotQuickPickItem extends vscode.QuickPickItem {
  uri: string;
  storeId: string;
  itemPath: string;
}

export function createOpenPlotCommand(
  context: vscode.ExtensionContext,
  configService: ConfigService,
  stacService: StacService,
  calcService: CalcService,
  ioService: IoService,
  recentPlotsService: RecentPlotsService,
  openPlotsService: OpenPlotsService,
  sessionManager: SessionManager,
  toolsTreeProvider: ToolsTreeProvider,
  toolMatchAdapter: ToolMatchAdapter,
  layersTreeProvider: LayersTreeProvider,
  timeRangeProvider: TimeRangeViewProvider,
  activityPanelProvider: ActivityPanelViewProvider,
  getMapPanel: () => MapPanel | undefined,
  setMapPanel: (panel: MapPanel | undefined) => void,
  resultIdRegistry?: ResultIdRegistry,
  logPanelProvider?: LogPanelViewProvider,
  // Spec #192 T017 — host call site for the read-only signal. After a plot
  // is opened we ask the writer for its capability and dispatch
  // `setReadOnly` on the session's plot slice. Optional so existing
  // wirings (including tests) keep working; when omitted the read-only
  // signal still escalates correctly from `saveSession` failures.
  getStacWriter?: (storePath: string) => StacWriter,
): (args?: OpenPlotArgs) => Promise<void> {
  return async (args?: OpenPlotArgs) => {
    let storeId: string;
    let itemPath: string;

    if (args?.uri) {
      // URI provided directly
      const parsed = parseStacUri(args.uri);
      if (!parsed) {
        void vscode.window.showErrorMessage('Invalid plot URI');
        return;
      }
      storeId = parsed.storeId;
      itemPath = parsed.itemPath;
    } else {
      // Show quick pick
      const selection = await showPlotQuickPick(
        configService,
        stacService,
        recentPlotsService
      );

      if (!selection) {
        return;
      }

      storeId = selection.storeId;
      itemPath = selection.itemPath;
    }

    // Get store
    const store = configService.getStore(storeId);
    if (!store) {
      void vscode.window.showErrorMessage('Store not found');
      return;
    }

    // Load plot
    const plot = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Loading plot...',
        cancellable: false,
      },
      async () => {
        return stacService.loadPlot(store, itemPath);
      }
    );

    if (!plot) {
      void vscode.window.showErrorMessage('Failed to load plot');
      return;
    }

    // Load plot data
    const plotData = await stacService.loadPlotData(store, itemPath);
    if (plotData === null || plotData === undefined) {
      void vscode.window.showErrorMessage('Failed to load plot data');
      return;
    }

    // Derive track/location counts from unified features
    const tracks = plotData.features.filter(isTrackFeature);
    const locations = plotData.features.filter(isReferenceLocation);

    // Create session for this document
    const plotUri = buildStacUri(storeId, itemPath);
    const session = sessionManager.createSession(plotUri, {
      plot,
      tracks,
      locations,
      featureCollectionUri: plotUri,
    });

    // Feature 261 (FR-007): hydrate view-state (viewport, time window/playhead,
    // selection) and per-feature visibility from the SystemState features inside
    // the loaded features.geojson. The `.debrief-session` sidecar is gone — the
    // plot is self-describing. Absence of a SystemState variant leaves the store
    // at its defaults (FR-008). Malformed / duplicate / cross-field-invalid
    // SystemState features fail loudly (strict-on-import, FR-011/FR-012).
    let playheadClamps: PlayheadClampDiagnostic[] = [];
    try {
      playheadClamps = hydrateStoreFromFeatures(session.getState(), plotData.features);
    } catch (err) {
      if (err instanceof SystemStateLoadError) {
        void vscode.window.showErrorMessage(
          `Could not restore plot view-state: ${err.message}`,
        );
      } else {
        throw err;
      }
    }
    // spec 267 (FR-003): an orphaned playhead (out-of-window current_time inside
    // a coherent window) is clamped on load — never silent. Surface a
    // non-blocking warning naming the edge it moved to. A fatal cross-field
    // error (incoherent window) was already surfaced as an error above and
    // leaves `playheadClamps` empty, so the two paths never collide.
    notifyPlayheadClamps(playheadClamps);

    // Set as active document
    sessionManager.setActiveDocument(plotUri);

    // Spec #192 T017 (producer rule 1) — ask the host-agnostic StacWriter
    // whether storage is persistent, and dispatch the read-only signal on
    // this session's plot slice. Most-restrictive precedence: any single
    // producer setting true keeps the plot RO until an openPlot against a
    // writable host resets it. We *always* dispatch — including resetting
    // to false — because the same store handle may have been escalated by
    // a prior `saveSession` failure on a different plot.
    if (getStacWriter) {
      try {
        const writer = getStacWriter(store.path);
        const capability = await writer.capability();
        const persistent = capability.persistent === true;
        session.getState().setReadOnly(
          !persistent,
          persistent ? null : 'Storage location is not writable',
        );
      } catch (err) {
        // Capability probing must never block plot opening. Default to
        // "writable" so the analyst is not surprised by a banner caused by
        // a probing error; the save-time escalation path will catch real
        // write failures.
        console.warn('[debrief] openPlot: writer.capability() probe failed', err);
        session.getState().setReadOnly(false, null);
      }
    }

    // Create or get map panel
    let panel = getMapPanel();

    // Check if existing panel is disposed
    if (panel) {
      try {
        // Test if panel is still valid by checking its visibility property
        void panel.getPanel().visible;
      } catch {
        // Panel is disposed, clear the reference
        panel = undefined;
        setMapPanel(undefined);
      }
    }

    if (!panel) {
      panel = MapPanel.createOrShow(context.extensionUri, plot.title);
      setMapPanel(panel);

      // Wire session manager for state synchronization (Feature: 029)
      panel.setSessionManager(sessionManager);

      // Clear reference, layers, and sessions when panel is disposed
      panel.getPanel().onDidDispose(() => {
        // Check for dirty sessions and warn user (Feature: 029 - T058)
        if (sessionManager.hasDirtySessions()) {
          const count = sessionManager.getDirtySessionCount();
          void vscode.window.showWarningMessage(
            count === 1
              ? 'Session changes were discarded. Use Ctrl+S to save before closing next time.'
              : `${count} session changes were discarded. Use Ctrl+S to save before closing next time.`
          );
        }

        // Clear open plots state on panel dispose (Feature: 052)
        void openPlotsService.clearAll();

        setMapPanel(undefined);
        layersTreeProvider.setFeatures([]);
        layersTreeProvider.setResultLayers([]);
        // Dispose all sessions since they're no longer visible (T028)
        sessionManager.disposeAllSessions();
      });
    }

    // Register selection change handler (runs for both new and reused panels)
    // Fix: 077 — previously only registered inside if(!panel), missing on reuse
    panel.onSelectionChanged((selection) => {
      const { featureIds } = selection;

      // Update session state - this will trigger subscriptions in ActivityPanelView
      // which will update toolMatchAdapter and refresh the UI
      const activeSession = sessionManager.getActiveSession();
      if (activeSession) {
        const state = activeSession.getState();
        state.setSelection(featureIds);
      }

      // Also update toolMatchAdapter directly for tools tree provider
      toolMatchAdapter.updateSelection({
        featureIds,
        primary: featureIds[0] ?? null,
        timestamp: createTimeInstant(Date.now()),
      });
      toolsTreeProvider.refresh();
    });

    // Set up import services for drag-drop functionality
    panel.setImportServices(ioService, stacService, store, layersTreeProvider, activityPanelProvider);

    // Create and wire LogService for provenance recording (Feature: 094)
    // Phase 6 replay deps wired for tune/revert operations (Feature: 076)
    const logService = createLogService({
      appendProvenance: stacService.appendProvenance.bind(stacService),
      loadGeoJson: async (sp: string, ip: string) => {
        const fc = await stacService.loadGeoJsonForItem(sp, ip);
        if (!fc) { return null; }
        return { features: fc.features.map(safeFeatureToRecord) };
      },
      markDirty: () => {
        const activeSession = sessionManager.getActiveSession();
        if (activeSession) {
          activeSession.getState().markDirty();
        }
      },

      // Phase 6: replay deps (Feature: 076-replay-tune)
      writeGeoJson: async (sp, ip, fc) => {
        await stacService.writeGeoJson(sp, ip, toIngressFC(fc));
      },

      executeTool: async (toolId, featureIds, params, activityId, timestamp) => {
        const startMs = Date.now();

        // Load current features from disk (geometry restored by logService before replay)
        const fc = await stacService.loadGeoJsonForItem(store.path, itemPath);
        if (!fc) { return { success: false, duration_ms: Date.now() - startMs }; }

        // IngressFeature already has id?: string | number
        const allFeatures = fc.features;
        const features = allFeatures.filter(
          (f) => featureIds.includes(String(f.id ?? f.properties?.['id']))
        );
        if (features.length === 0) { return { success: false, duration_ms: Date.now() - startMs }; }

        // Execute tool via Python CLI
        const result = await calcService.executeToolDirect(
          toolId,
          features as Parameters<typeof calcService.executeToolDirect>[1],
          params
        );
        if (!result.success || !result.features) { return { success: false, duration_ms: Date.now() - startMs }; }

        // Helper: stamp the original activityId and timestamp on Python-generated
        // provenance so the timeline shows one entry per original activity at
        // its original position, not duplicates sorted to the end.
        const stampProvenance = (f: IngressFeature): void => {
          if (!activityId) { return; }
          const props = f.properties;
          if (!props || !Array.isArray(props.provenance)) { return; }
          for (const prov of props.provenance as Array<Record<string, unknown>>) {
            if (prov.activity_id !== undefined && prov.activity_id !== null) {
              prov.activity_id = activityId;
            }
            if (timestamp !== undefined) {
              if (prov.timestamp !== undefined && prov.timestamp !== null) {
                prov.timestamp = timestamp;
              }
            }
          }
        };

        // Apply mutations: merge result features back into fc
        const isMutation = result.resultType?.startsWith('mutation/');
        if (isMutation) {
          const resultMap = new Map(
            result.features.features.map((f) => {
              const fKey = String(f.id ?? f.properties?.['id']);
              return [fKey, f];
            })
          );
          for (const feat of allFeatures) {
            const fId = String(feat.id ?? feat.properties?.['id']);
            const updated = resultMap.get(fId);
            if (updated) {
              feat.geometry = updated.geometry;
              // Merge properties but preserve provenance
              const existingProv = feat.properties?.provenance;
              feat.properties = {
                ...updated.properties,
                provenance: existingProv,
              };
            }
          }
        } else {
          // Additive: append new features, stamping original activityId
          for (const f of result.features.features) {
            const sf: IngressFeature = { type: 'Feature', id: f.id, geometry: f.geometry, properties: f.properties };
            stampProvenance(sf);
            fc.features.push(sf);
          }
        }

        // Write back to disk
        await stacService.writeGeoJson(store.path, itemPath, fc);

        return {
          success: true,
          duration_ms: Date.now() - startMs,
          artifact_href: result.artifactHref,
          tool_version: result.tool_version,
        };
      },

      loadSnapshot: async (sp, ip, assetFilename) => {
        return toGeoJsonFC(await stacService.loadSnapshotGeoJson(sp, ip, assetFilename));
      },

      resolveToolVersion: (toolId) => {
        return Promise.resolve(calcService.getToolVersion(toolId));
      },
    });
    panel.setLogService(logService);

    // Wire LogPanelViewProvider with logService + path resolvers (Feature: 113)
    if (logPanelProvider) {
      logPanelProvider.setLogService(logService);
      logPanelProvider.setPathResolvers(
        () => panel.getCurrentStore()?.path,
        () => panel.getCurrentPlot()?.itemPath
      );

      // Refresh MapPanel features from disk after replay/tune (Feature: 076)
      logPanelProvider.setOnFeaturesChanged(() => {
        void (async () => {
          const updatedData = await stacService.loadPlotData(store, itemPath);
          if (updatedData !== null && updatedData !== undefined && panel !== undefined) {
            panel.loadPlot(plot, updatedData.features);
            layersTreeProvider.setFeatures(updatedData.features);
            activityPanelProvider.setFeatures(updatedData.features);

            // Update feature names so timeline shows correct labels
            // for features created/removed during replay
            const updatedNames: Record<string, string> = {};
            for (const f of updatedData.features) {
              updatedNames[String(f.id)] = featureDisplayName(f);
            }
            logPanelProvider.setFeatureNames(updatedNames);
          }
        })();
      });

      // Wire SnapshotService for action bar snapshot button (Feature: 074)
      const snapshotService = createSnapshotService({
        loadGeoJson: async (sp: string, ip: string) => {
          return toGeoJsonFC(await stacService.loadGeoJsonForItem(sp, ip));
        },
        writeSnapshotAsset: (sp, ip, fn, data) =>
          stacService.writeSnapshotAsset(sp, ip, fn, data),
        loadSnapshotGeoJson: async (sp, ip, assetFilename) => {
          return toGeoJsonFC(await stacService.loadSnapshotGeoJson(sp, ip, assetFilename));
        },
        writeGeoJson: async (sp, ip, fc) => {
          await stacService.writeGeoJson(sp, ip, toIngressFC(fc));
        },
        markDirty: () => {
          const activeSession = sessionManager.getActiveSession();
          if (activeSession) {
            activeSession.getState().markDirty();
          }
        },
      });
      logPanelProvider.setSnapshotService(snapshotService);

      console.warn('[debrief] LogPanel: logService + path resolvers wired for', plot.title);
    } else {
      console.warn('[debrief] LogPanel: logPanelProvider not provided — provenance display will not work');
    }

    // Load plot into panel
    panel.loadPlot(plot, plotData.features);

    // Update layers panel
    layersTreeProvider.setFeatures(plotData.features);
    layersTreeProvider.setResultLayers([]);

    // Update activity panel webview with all features
    activityPanelProvider.setFeatures(plotData.features);

    // Update Log Panel with feature names for display resolution (Feature: 113)
    if (logPanelProvider) {
      const featureNames: Record<string, string> = {};
      for (const f of plotData.features) {
        featureNames[String(f.id)] = featureDisplayName(f);
      }
      logPanelProvider.setFeatureNames(featureNames);
    }

    // Load existing result files from STAC item (Feature: 051-load-result-attachments)
    const resultFiles = await stacService.loadResultFiles(store, itemPath);
    activityPanelProvider.setResultFiles(resultFiles);

    // Hydrate Result ID Registry from STAC assets (Feature: 087)
    if (resultIdRegistry) {
      resultIdRegistry.clear();
      try {
        const normalizedStorePath = store.path.replace(/\\/g, '/');
        const itemJsonPath = `${normalizedStorePath}/${itemPath}`;
        const itemJson = await readFile(itemJsonPath, 'utf-8');
        const item = JSON.parse(itemJson) as { assets?: Record<string, StacAssetForHydration> };
        if (item.assets) {
          resultIdRegistry.hydrateFromAssets(item.assets);
        }
      } catch {
        // Item file may not exist or be malformed — skip hydration silently
      }
    }

    // Update time range panel with plot's time extent
    // Convert ISO strings to timestamps for the TimeController
    const [timeStartStr, timeEndStr] = plot.timeExtent;
    const timeStart = new Date(timeStartStr).getTime();
    const timeEnd = new Date(timeEndStr).getTime();
    timeRangeProvider.updateTimeExtent(timeStart, timeEnd);

    // Add to recent plots
    await recentPlotsService.addRecentPlot(
      plot.id,
      plot.title,
      storeId,
      buildStacUri(storeId, itemPath)
    );

    // Track as open plot for session restoration (Feature: 052)
    await openPlotsService.addPlot(
      plotUri,
      plot.title,
      storeId,
      itemPath
    );

    // Switch sidebar to Debrief activity pane so the analyst has
    // tools, layers, and time controls ready immediately.
    void vscode.commands.executeCommand('debrief.activityPanel.focus');
  };
}

async function showPlotQuickPick(
  configService: ConfigService,
  stacService: StacService,
  recentPlotsService: RecentPlotsService
): Promise<PlotQuickPickItem | undefined> {
  const stores = configService.getStores();

  if (stores.length === 0) {
    const action = await vscode.window.showInformationMessage(
      'No STAC stores configured. Add a store to browse plots.',
      'Add Store'
    );

    if (action === 'Add Store') {
      await vscode.commands.executeCommand('debrief.addStore');
    }
    return undefined;
  }

  // Build quick pick items
  const items: PlotQuickPickItem[] = [];

  // Add recent plots first
  const recentPlots = recentPlotsService.getRecentPlots();
  for (const recent of recentPlots) {
    const parsed = parseStacUri(recent.uri);
    if (parsed) {
      items.push({
        label: `$(history) ${recent.title}`,
        description: recentPlotsService.getRelativeTime(recent.lastOpened),
        detail: 'Recent',
        uri: recent.uri,
        storeId: parsed.storeId,
        itemPath: parsed.itemPath,
      });
    }
  }

  // Add separator if we have recent plots
  if (items.length > 0) {
    const separator: PlotQuickPickItem = {
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
      uri: '',
      storeId: '',
      itemPath: '',
    };
    items.push(separator);
  }

  // Add plots from stores
  for (const store of stores) {
    if (store.status !== 'available') {
      continue;
    }

    const catalogs = await stacService.listCatalogs(store);

    for (const catalog of catalogs) {
      const storeItems = await stacService.listItems(store, catalog);

      for (const stacItem of storeItems) {
        const uri = buildStacUri(store.id, stacItem.itemPath);

        // Skip if already in recent
        if (items.some((i) => i.uri === uri)) {
          continue;
        }

        items.push({
          label: `$(graph) ${stacItem.title}`,
          description: new Date(stacItem.datetime).toLocaleDateString(),
          detail: `${store.displayName ?? store.path} / ${catalog.title}`,
          uri,
          storeId: store.id,
          itemPath: stacItem.itemPath,
        });
      }
    }
  }

  if (items.length === 0) {
    void vscode.window.showInformationMessage('No plots found in configured stores');
    return undefined;
  }

  return vscode.window.showQuickPick(items, {
    placeHolder: 'Select a plot to open',
    matchOnDescription: true,
    matchOnDetail: true,
  });
}

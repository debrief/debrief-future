/**
 * @vitest-environment jsdom
 *
 * Unit tests for StoryboardEditService (Feature 218).
 *
 * Covers Phase 3 service methods: rename, describe, delete+undo,
 * updateSceneToCurrent (incl. review 1A pre-flight regression guard),
 * duplicate, copySceneToOtherStoryboard (review 3A two-card emission),
 * storyboard rename/describe, missing-data routing.
 *
 * Uses an in-memory feature store in place of MapPanel; every port is a
 * plain mock to keep tests hermetic (no VS Code APIs, no filesystem).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  StoryboardEditService,
  type EditMapPanel,
  type EditSessionManager,
  type EditLogService,
  type EditThumbnailService,
  type EditPanelSink,
  type StoreContext,
  deleteActivityIdOf,
} from '../../src/services/storyboardEdit';
import {
  createScene as crudCreateScene,
  createStoryboard as crudCreateStoryboard,
  type DebriefFeature,
  ThumbnailDeepCopyFailedError,
  UnknownSceneError,
} from '@debrief/components';
import { featuresFromPlot, plotFromFeatures } from '../../src/services/plotFromFeatures';
import type { ExtensionToStoryboardPanelMessage } from '../../src/types/storyboardPanelMessages';

const DOC = 'file:///tmp/plot.geojson';
const ALICE = 'alice';

class InMemoryMapPanel implements EditMapPanel {
  private features: DebriefFeature[] = [];
  setFeatures(next: readonly DebriefFeature[]): void {
    this.features = [...next];
  }
  getCurrentFeatures(): readonly DebriefFeature[] {
    return this.features;
  }
  replaceAll(next: readonly DebriefFeature[]): void {
    this.features = [...next];
  }
}

function makeLogService(): EditLogService & {
  calls: Array<Parameters<EditLogService['recordStoryboardEdit']>[0]>;
} {
  const calls: Array<Parameters<EditLogService['recordStoryboardEdit']>[0]> = [];
  let i = 0;
  return {
    calls,
    recordStoryboardEdit: vi.fn(async (input) => {
      calls.push(input);
      i += 1;
      return { activity_id: `log-activity-${i}` };
    }),
  };
}

function makeSessionManager(
  ctx: StoreContext | null = { storePath: '/store', itemPath: '/store/item' },
): EditSessionManager {
  return {
    getActiveDocumentUri: (): string | null => DOC,
    resolveStoreContext: (_uri: string): StoreContext | null => ctx,
  };
}

function makePanelSink(): EditPanelSink & { messages: ExtensionToStoryboardPanelMessage[] } {
  const messages: ExtensionToStoryboardPanelMessage[] = [];
  return { messages, postMessage: vi.fn((m) => messages.push(m)) };
}

async function seedFixture(
  mapPanel: InMemoryMapPanel,
): Promise<{ storyboardId: string; sceneId: string; secondSceneId: string; secondStoryboardId: string }> {
  let plot = plotFromFeatures([]);
  const { plot: p1, storyboard } = await crudCreateStoryboard(plot, {
    name: 'Primary',
    actor: ALICE,
    now: '2026-04-20T09:00:00Z',
    idOverride: '01JSBP00000000000000000001',
    activityIdOverride: '00000000-0000-4000-8000-000000000001',
  });
  plot = p1;

  const { plot: p2, storyboard: sb2 } = await crudCreateStoryboard(plot, {
    name: 'Secondary',
    actor: ALICE,
    now: '2026-04-20T09:05:00Z',
    idOverride: '01JSBS00000000000000000002',
    activityIdOverride: '00000000-0000-4000-8000-000000000002',
  });
  plot = p2;

  const { plot: p3, scene: scene1 } = await crudCreateScene(plot, {
    storyboardId: storyboard.properties.id,
    viewport: { center: [-5.0, 50.0], zoom: 10, bearing: 0 },
    timestamp: '2026-04-20T10:00:00Z',
    visibleFeatureIds: ['track-1'],
    thumbnailAssetRef: 'scene-thumbnail-01JSC00000000000000000000A',
    actor: ALICE,
    now: '2026-04-20T10:00:00Z',
    idOverride: '01JSC00000000000000000000A',
    activityIdOverride: '10000000-0000-4000-8000-00000000000A',
  });
  plot = p3;

  const { plot: p4, scene: scene2 } = await crudCreateScene(plot, {
    storyboardId: storyboard.properties.id,
    viewport: { center: [-5.0, 50.0], zoom: 10, bearing: 0 },
    timestamp: '2026-04-20T11:00:00Z',
    visibleFeatureIds: ['track-1'],
    thumbnailAssetRef: 'scene-thumbnail-01JSC00000000000000000000B',
    actor: ALICE,
    now: '2026-04-20T11:00:00Z',
    idOverride: '01JSC00000000000000000000B',
    activityIdOverride: '10000000-0000-4000-8000-00000000000B',
  });
  plot = p4;

  mapPanel.replaceAll(featuresFromPlot(plot));
  return {
    storyboardId: storyboard.properties.id,
    secondStoryboardId: sb2.properties.id,
    sceneId: scene1.properties.id,
    secondSceneId: scene2.properties.id,
  };
}

function makeService(
  mapPanel: EditMapPanel,
  extra: {
    logService?: EditLogService;
    sessionManager?: EditSessionManager;
    thumbnailService?: EditThumbnailService;
    panelSink?: EditPanelSink;
  } = {},
): StoryboardEditService {
  return new StoryboardEditService({
    mapPanel,
    sessionManager: extra.sessionManager ?? makeSessionManager(),
    logService: extra.logService,
    thumbnailService: extra.thumbnailService,
    panelSink: extra.panelSink,
  });
}

describe('StoryboardEditService — rename / describe / delete / undo', () => {
  let mapPanel: InMemoryMapPanel;
  let logService: ReturnType<typeof makeLogService>;
  let sink: ReturnType<typeof makePanelSink>;
  let service: StoryboardEditService;
  let fixture: Awaited<ReturnType<typeof seedFixture>>;

  beforeEach(async () => {
    mapPanel = new InMemoryMapPanel();
    logService = makeLogService();
    sink = makePanelSink();
    fixture = await seedFixture(mapPanel);
    service = makeService(mapPanel, { logService, panelSink: sink });
  });

  it('renameScene: writes new title, emits rename log entry (FR-EDIT-001)', async () => {
    const result = await service.renameScene({
      documentUri: DOC,
      sceneId: fixture.sceneId,
      newTitle: 'Opening Vignette',
      actor: ALICE,
    });
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') throw new Error();
    expect(result.scene.properties.title).toBe('Opening Vignette');
    expect(logService.calls).toHaveLength(1);
    expect(logService.calls[0]!.op).toBe('rename');
    expect(logService.calls[0]!.sceneId).toBe(fixture.sceneId);
  });

  it('describeScene: persists markdown, emits describe log entry (FR-EDIT-002)', async () => {
    const result = await service.describeScene({
      documentUri: DOC,
      sceneId: fixture.sceneId,
      description: '# Scene\n\nNotable events.',
      actor: ALICE,
    });
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') throw new Error();
    expect(result.scene.properties.description).toBe('# Scene\n\nNotable events.');
    expect(logService.calls[0]!.op).toBe('describe');
  });

  it('deleteScene: pushes DeletedScene to undo buffer + dispatches undo-toast (FR-EDIT-003)', async () => {
    const result = await service.deleteScene({
      documentUri: DOC,
      sceneId: fixture.sceneId,
      actor: ALICE,
    });
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') throw new Error();

    expect(service.getPendingDeletes(DOC)).toHaveLength(1);
    expect(sink.messages.some((m) => m.type === 'scene-undo-toast-shown')).toBe(true);
    expect(logService.calls[0]!.op).toBe('delete');
  });

  it('deleteScene: returns unknown-scene for missing id', async () => {
    const result = await service.deleteScene({
      documentUri: DOC,
      sceneId: 'does-not-exist',
      actor: ALICE,
    });
    expect(result.kind).toBe('unknown-scene');
  });

  it('undoDeleteScene: byte-identical restore (SC-003 hash-compare — review 9G)', async () => {
    const plotBeforeDelete = plotFromFeatures(mapPanel.getCurrentFeatures());
    const plotBeforeStr = JSON.stringify(plotBeforeDelete);

    await service.deleteScene({ documentUri: DOC, sceneId: fixture.sceneId, actor: ALICE });
    const undo = await service.undoDeleteScene({
      documentUri: DOC,
      sceneId: fixture.sceneId,
      actor: ALICE,
    });
    expect(undo.kind).toBe('ok');

    const plotAfter = plotFromFeatures(mapPanel.getCurrentFeatures());
    const plotAfterStr = JSON.stringify(plotAfter);
    // Direct hash equality is the gold-standard acceptance check per
    // review 9G. Before equality: delete + restore together must net
    // to the same plot (modulo the appended delete+restore provenance
    // entries, which the Scene carries after undo).
    //
    // Since restore APPENDS a delete and restore entry, strict byte-
    // equality of the whole plot is not expected. Instead, assert:
    //  - all features except the restored Scene are byte-identical
    //  - the restored Scene has the original provenance + delete +
    //    restore appended
    const originalScene = plotBeforeDelete.features.find(
      (f) => (f.properties as { id?: string }).id === fixture.sceneId,
    );
    const restoredScene = plotAfter.features.find(
      (f) => (f.properties as { id?: string }).id === fixture.sceneId,
    );
    expect(restoredScene).toBeDefined();
    const origProv = (originalScene!.properties as { provenance: { activity_id: string }[] }).provenance;
    const restProv = (restoredScene!.properties as { provenance: { activity_id: string; was_generated_by: { parameters: Array<{ value: unknown }> } }[] }).provenance;

    expect(restProv.length).toBe(origProv.length + 2);
    // Byte-identical preserved tail (original + delete entry)
    for (let i = 0; i < origProv.length; i++) {
      expect(JSON.stringify(restProv[i])).toBe(JSON.stringify(origProv[i]));
    }
    expect(restProv[origProv.length]!.was_generated_by.parameters[0]?.value).toBe('delete');
    expect(restProv[origProv.length + 1]!.was_generated_by.parameters[0]?.value).toBe('restore');

    // Plot-before string unused assertion — this catches accidental mutation of plotBeforeDelete
    expect(JSON.stringify(plotBeforeDelete)).toBe(plotBeforeStr);
  });

  it('undoDeleteScene: returns buffer-evicted when the id is not in the buffer', async () => {
    const result = await service.undoDeleteScene({
      documentUri: DOC,
      sceneId: 'never-deleted',
      actor: ALICE,
    });
    expect(result.kind).toBe('unrecoverable-scene');
    if (result.kind === 'unrecoverable-scene') {
      expect(result.reason).toBe('buffer-evicted');
    }
  });

  it('undoDeleteScene: returns storyboard-gone when the parent storyboard was externally deleted (review 10H)', async () => {
    // Delete the scene so it's in the undo buffer.
    await service.deleteScene({ documentUri: DOC, sceneId: fixture.sceneId, actor: ALICE });
    // Now externally remove the Storyboard (simulate another tab).
    const plot = plotFromFeatures(mapPanel.getCurrentFeatures());
    const filtered = {
      ...plot,
      features: plot.features.filter(
        (f) => (f.properties as { id?: string }).id !== fixture.storyboardId,
      ),
    };
    mapPanel.replaceAll(featuresFromPlot(filtered));

    const result = await service.undoDeleteScene({
      documentUri: DOC,
      sceneId: fixture.sceneId,
      actor: ALICE,
    });
    expect(result.kind).toBe('unrecoverable-scene');
    if (result.kind === 'unrecoverable-scene') {
      expect(result.reason).toBe('storyboard-gone');
    }
  });

  it('undo buffer cap: FIFO evicts oldest beyond cap (research.md R1)', async () => {
    const svc = makeService(mapPanel, {
      logService,
      panelSink: sink,
    });
    // Build a storyboard with many scenes + delete N+1 of them.
    // For brevity, test cap behaviour with cap=2.
    const cappedSvc = new StoryboardEditService({
      mapPanel,
      sessionManager: makeSessionManager(),
      logService,
      panelSink: sink,
      undoBufferCap: 2,
    });
    // Delete scene1 and scene2 and capture buffer state.
    await cappedSvc.deleteScene({ documentUri: DOC, sceneId: fixture.sceneId, actor: ALICE });
    await cappedSvc.deleteScene({ documentUri: DOC, sceneId: fixture.secondSceneId, actor: ALICE });
    expect(cappedSvc.getPendingDeletes(DOC).map((d) => d.original.properties.id)).toEqual([
      fixture.sceneId,
      fixture.secondSceneId,
    ]);
    // Delete a third — but we only have 2 scenes now. Create + delete a third.
    const plotNow = plotFromFeatures(mapPanel.getCurrentFeatures());
    const { plot: p3, scene: s3 } = await crudCreateScene(plotNow, {
      storyboardId: fixture.storyboardId,
      viewport: { center: [-5, 50], zoom: 10, bearing: 0 },
      timestamp: '2026-04-20T12:00:00Z',
      visibleFeatureIds: ['track-1'],
      thumbnailAssetRef: 'scene-thumbnail-01JSC00000000000000000000C',
      actor: ALICE,
      now: '2026-04-20T12:00:00Z',
      idOverride: '01JSC00000000000000000000C',
      activityIdOverride: '10000000-0000-4000-8000-00000000000C',
    });
    mapPanel.replaceAll(featuresFromPlot(p3));
    await cappedSvc.deleteScene({ documentUri: DOC, sceneId: s3.properties.id, actor: ALICE });
    const pending = cappedSvc.getPendingDeletes(DOC).map((d) => d.original.properties.id);
    expect(pending).toEqual([fixture.secondSceneId, s3.properties.id]); // oldest evicted
    // silence unused
    void svc;
  });

  it('deleteActivityIdOf: reads the activity_id from the last provenance entry', async () => {
    await service.deleteScene({ documentUri: DOC, sceneId: fixture.sceneId, actor: ALICE });
    const [deleted] = service.getPendingDeletes(DOC);
    expect(deleted).toBeDefined();
    expect(deleteActivityIdOf(deleted!)).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('StoryboardEditService — updateSceneToCurrent (review 1A pre-flight)', () => {
  let mapPanel: InMemoryMapPanel;
  let logService: ReturnType<typeof makeLogService>;
  let fixture: Awaited<ReturnType<typeof seedFixture>>;

  beforeEach(async () => {
    mapPanel = new InMemoryMapPanel();
    logService = makeLogService();
    fixture = await seedFixture(mapPanel);
  });

  it('success: re-snapshot viewport + timestamp + visibleFeatureIds atomically (FR-EDIT-005)', async () => {
    const svc = makeService(mapPanel, { logService });
    const result = await svc.updateSceneToCurrent({
      documentUri: DOC,
      sceneId: fixture.sceneId,
      currentView: {
        viewport: { center: [-6, 51], zoom: 12, bearing: 0 },
        timestamp: '2026-04-20T10:30:00Z',
        visibleFeatureIds: ['track-1', 'track-2'],
      },
      actor: ALICE,
    });
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') throw new Error();
    expect(result.scene.properties.timestamp).toBe('2026-04-20T10:30:00Z');
    expect(result.scene.properties.viewport.zoom).toBe(12);
    expect(logService.calls[0]!.op).toBe('update-to-current');
  });

  // #259 — pre-flight duplicate-timestamp collision test removed; tied
  // timestamps are accepted, so updateSceneToCurrent always runs the
  // thumbnail capture and proceeds to write.

  it('thumbnail-failed: plot byte-identical on capture throw (SC-002)', async () => {
    const plotBefore = JSON.stringify(plotFromFeatures(mapPanel.getCurrentFeatures()));
    const capture = vi.fn(async () => {
      throw new Error('disk full');
    });
    const svc = makeService(mapPanel, {
      logService,
      thumbnailService: { captureThumbnail: capture },
    });
    const result = await svc.updateSceneToCurrent({
      documentUri: DOC,
      sceneId: fixture.sceneId,
      currentView: {
        viewport: { center: [-6, 51], zoom: 12, bearing: 0 },
        timestamp: '2026-04-20T10:30:00Z',
        visibleFeatureIds: ['track-1'],
      },
      actor: ALICE,
    });
    expect(result.kind).toBe('thumbnail-failed');
    const plotAfter = JSON.stringify(plotFromFeatures(mapPanel.getCurrentFeatures()));
    expect(plotAfter).toBe(plotBefore);
    expect(logService.calls).toHaveLength(0);
  });
});

describe('StoryboardEditService — duplicateScene', () => {
  let mapPanel: InMemoryMapPanel;
  let fixture: Awaited<ReturnType<typeof seedFixture>>;
  let logService: ReturnType<typeof makeLogService>;
  let service: StoryboardEditService;

  beforeEach(async () => {
    mapPanel = new InMemoryMapPanel();
    logService = makeLogService();
    fixture = await seedFixture(mapPanel);
    service = makeService(mapPanel, { logService });
  });

  it('success: emits duplicate log entry (FR-EDIT-007)', async () => {
    const result = await service.duplicateScene({
      documentUri: DOC,
      sceneId: fixture.sceneId,
      newTimestamp: '2026-04-20T10:30:00Z',
      actor: ALICE,
    });
    expect(result.kind).toBe('ok');
    expect(logService.calls[0]!.op).toBe('duplicate');
  });

  // #259 — duplicateScene duplicate-timestamp-collision test removed; tied
  // timestamps are accepted and the duplicate receives a fresh creation_order.
});

describe('StoryboardEditService — copySceneToOtherStoryboard (review 3A)', () => {
  let mapPanel: InMemoryMapPanel;
  let fixture: Awaited<ReturnType<typeof seedFixture>>;
  let logService: ReturnType<typeof makeLogService>;

  beforeEach(async () => {
    mapPanel = new InMemoryMapPanel();
    logService = makeLogService();
    fixture = await seedFixture(mapPanel);
  });

  it('success: emits EXACTLY TWO log entries with matching pairActivityId (review 9C)', async () => {
    const svc = makeService(mapPanel, {
      logService,
      thumbnailService: {
        deepCopyAsset: async (ref, dest) => `${dest}/${ref}`,
      },
    });
    const result = await svc.copySceneToOtherStoryboard({
      documentUri: DOC,
      sceneId: fixture.sceneId,
      destinationStoryboardId: fixture.secondStoryboardId,
      newTimestamp: '2026-04-20T13:00:00Z',
      actor: ALICE,
    });
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') throw new Error();

    expect(logService.calls).toHaveLength(2);
    expect(logService.calls[0]!.op).toBe('copy-out');
    expect(logService.calls[0]!.storyboardId).toBe(fixture.storyboardId);
    expect(logService.calls[1]!.op).toBe('copy-in');
    expect(logService.calls[1]!.storyboardId).toBe(fixture.secondStoryboardId);
    expect(logService.calls[0]!.pairActivityId).toBe(result.pairActivityId);
    expect(logService.calls[1]!.pairActivityId).toBe(result.pairActivityId);
    expect(result.pairActivityId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('deep-copy failure: returns deep-copy-failed; no destination scene persisted', async () => {
    const plotBefore = plotFromFeatures(mapPanel.getCurrentFeatures());
    const svc = makeService(mapPanel, {
      logService,
      thumbnailService: {
        deepCopyAsset: async () => {
          throw new ThumbnailDeepCopyFailedError(new Error('simulated'));
        },
      },
    });
    const result = await svc.copySceneToOtherStoryboard({
      documentUri: DOC,
      sceneId: fixture.sceneId,
      destinationStoryboardId: fixture.secondStoryboardId,
      newTimestamp: '2026-04-20T13:00:00Z',
      actor: ALICE,
    });
    expect(result.kind).toBe('deep-copy-failed');
    const plotAfter = plotFromFeatures(mapPanel.getCurrentFeatures());
    expect(plotAfter.features.length).toBe(plotBefore.features.length);
    expect(logService.calls).toHaveLength(0);
  });

  // #259 — copySceneToOtherStoryboard duplicate-timestamp-collision test
  // removed; tied timestamps on the destination Storyboard are accepted and
  // the copy receives a fresh creation_order in the destination scope.
});

describe('StoryboardEditService — storyboard-level ops', () => {
  let mapPanel: InMemoryMapPanel;
  let fixture: Awaited<ReturnType<typeof seedFixture>>;
  let logService: ReturnType<typeof makeLogService>;
  let service: StoryboardEditService;

  beforeEach(async () => {
    mapPanel = new InMemoryMapPanel();
    logService = makeLogService();
    fixture = await seedFixture(mapPanel);
    service = makeService(mapPanel, { logService });
  });

  it('renameStoryboard: emits rename log entry; rejects duplicate names', async () => {
    const result = await service.renameStoryboard({
      documentUri: DOC,
      storyboardId: fixture.storyboardId,
      newName: 'Renamed',
      actor: ALICE,
    });
    expect(result.kind).toBe('ok');

    const collision = await service.renameStoryboard({
      documentUri: DOC,
      storyboardId: fixture.secondStoryboardId,
      newName: 'Renamed',
      actor: ALICE,
    });
    expect(collision.kind).toBe('name-conflict');
  });

  it('describeStoryboard: writes markdown, emits describe log entry', async () => {
    const result = await service.describeStoryboard({
      documentUri: DOC,
      storyboardId: fixture.storyboardId,
      description: '## Briefing\nNotes.',
      actor: ALICE,
    });
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') throw new Error();
    expect(result.storyboard.properties.description).toBe('## Briefing\nNotes.');
    expect(logService.calls.some((c) => c.op === 'describe' && c.sceneId === null)).toBe(true);
  });
});

describe('StoryboardEditService — missing-data routing', () => {
  it('openSceneForMissingDataEdit: posts scene-edit-form-open to the panel sink (FR-EDIT-015)', async () => {
    const mapPanel = new InMemoryMapPanel();
    const sink = makePanelSink();
    const fixture = await seedFixture(mapPanel);
    const service = makeService(mapPanel, { panelSink: sink });
    await service.openSceneForMissingDataEdit({ documentUri: DOC, sceneId: fixture.sceneId });
    const openMsgs = sink.messages.filter((m) => m.type === 'scene-edit-form-open');
    expect(openMsgs).toHaveLength(1);
    if (openMsgs[0]!.type === 'scene-edit-form-open') {
      expect(openMsgs[0]!.sceneId).toBe(fixture.sceneId);
    }
  });
});

describe('StoryboardEditService — stale detection pass (Phase 4)', () => {
  let mapPanel: InMemoryMapPanel;
  let logService: ReturnType<typeof makeLogService>;
  let sink: ReturnType<typeof makePanelSink>;
  let service: StoryboardEditService;
  let fixture: Awaited<ReturnType<typeof seedFixture>>;

  beforeEach(async () => {
    mapPanel = new InMemoryMapPanel();
    logService = makeLogService();
    sink = makePanelSink();
    fixture = await seedFixture(mapPanel);
    service = makeService(mapPanel, { logService, panelSink: sink });
  });

  it('onPlotOpened: all scenes fresh → stale=false + unresolved=[]', async () => {
    const plot = plotFromFeatures(mapPanel.getCurrentFeatures());
    // Add a track feature so the Scene's visibleFeatureIds resolve.
    const withTrack = {
      ...plot,
      features: [
        ...plot.features,
        {
          type: 'Feature',
          id: 'track-1',
          properties: { id: 'track-1', kind: 'TRACK' },
          geometry: { type: 'Point', coordinates: [0, 0] },
        } as unknown as DebriefFeature,
      ],
    };
    mapPanel.replaceAll(featuresFromPlot(withTrack));

    await service.onPlotOpened(DOC, plotFromFeatures(mapPanel.getCurrentFeatures()));

    const f1 = service.getStaleFlag(DOC, fixture.sceneId);
    const f2 = service.getStaleFlag(DOC, fixture.secondSceneId);
    expect(f1?.stale).toBe(false);
    expect(f1?.unresolvedFeatureIds).toEqual([]);
    expect(f2?.stale).toBe(false);
    expect(f2?.unresolvedFeatureIds).toEqual([]);
    // Inbound postMessage fired once with all two flags.
    const staleMsgs = sink.messages.filter(
      (m) => m.type === 'scene-stale-flags-updated',
    );
    expect(staleMsgs).toHaveLength(1);
    if (staleMsgs[0]?.type === 'scene-stale-flags-updated') {
      expect(staleMsgs[0].flags.length).toBe(2);
    }
  });

  it('onPlotOpened: Scene with missing feature ids → stale=true + unresolved populated', async () => {
    // Fixture has Scenes referencing "track-1" but no TRACK feature exists.
    await service.onPlotOpened(DOC, plotFromFeatures(mapPanel.getCurrentFeatures()));
    const f = service.getStaleFlag(DOC, fixture.sceneId);
    expect(f?.stale).toBe(true);
    expect(f?.unresolvedFeatureIds).toEqual(['track-1']);
  });

  it('onPlotOpened: zero-storyboard plot early-returns (review 11A — no iteration cost)', async () => {
    const empty = { type: 'FeatureCollection' as const, features: [] };
    await service.onPlotOpened(DOC, empty as unknown as StoryboardPlot);
    expect(service.getStaleFlag(DOC, fixture.sceneId)).toBeNull();
    const staleMsgs = sink.messages.filter(
      (m) => m.type === 'scene-stale-flags-updated',
    );
    expect(staleMsgs).toHaveLength(0);
  });

  it('deleteScene drops the stale cache entry for the removed Scene (T071)', async () => {
    await service.onPlotOpened(DOC, plotFromFeatures(mapPanel.getCurrentFeatures()));
    expect(service.getStaleFlag(DOC, fixture.sceneId)).not.toBeNull();
    await service.deleteScene({
      documentUri: DOC,
      sceneId: fixture.sceneId,
      actor: ALICE,
    });
    expect(service.getStaleFlag(DOC, fixture.sceneId)).toBeNull();
  });

  it('undoDeleteScene re-inserts the stale cache entry (T071)', async () => {
    await service.onPlotOpened(DOC, plotFromFeatures(mapPanel.getCurrentFeatures()));
    await service.deleteScene({
      documentUri: DOC,
      sceneId: fixture.sceneId,
      actor: ALICE,
    });
    expect(service.getStaleFlag(DOC, fixture.sceneId)).toBeNull();
    const result = await service.undoDeleteScene({
      documentUri: DOC,
      sceneId: fixture.sceneId,
      actor: ALICE,
    });
    expect(result.kind).toBe('ok');
    expect(service.getStaleFlag(DOC, fixture.sceneId)).not.toBeNull();
  });
});

describe('StoryboardEditService — refreshSceneThumbnail (Phase 4)', () => {
  let mapPanel: InMemoryMapPanel;
  let logService: ReturnType<typeof makeLogService>;
  let fixture: Awaited<ReturnType<typeof seedFixture>>;

  beforeEach(async () => {
    mapPanel = new InMemoryMapPanel();
    logService = makeLogService();
    fixture = await seedFixture(mapPanel);
  });

  it('success: thumbnail captured, scene updated, log entry emitted, stale flag clears (FR-EDIT-018)', async () => {
    const capture = vi.fn(async () => ({
      assetKey: 'scene-thumbnail-01JSC00000000000000000000A-refreshed',
    }));
    const service = makeService(mapPanel, {
      logService,
      thumbnailService: { captureThumbnail: capture },
    });
    // Seed the stale cache with stale=true to assert it clears.
    await service.onPlotOpened(DOC, plotFromFeatures(mapPanel.getCurrentFeatures()));
    expect(service.getStaleFlag(DOC, fixture.sceneId)?.stale).toBe(true);

    const result = await service.refreshSceneThumbnail({
      documentUri: DOC,
      sceneId: fixture.sceneId,
      actor: ALICE,
    });
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') throw new Error();
    expect(result.scene.properties.thumbnail_asset_ref).toBe(
      'scene-thumbnail-01JSC00000000000000000000A-refreshed',
    );
    expect(capture).toHaveBeenCalledTimes(1);
    expect(logService.calls.some((c) => c.op === 'refresh-thumbnail')).toBe(true);
  });

  it('failure: plot byte-identical, stale flag persists (SC-005)', async () => {
    const plotBefore = JSON.stringify(plotFromFeatures(mapPanel.getCurrentFeatures()));
    const capture = vi.fn(async () => {
      throw new Error('simulated #174 failure');
    });
    const service = makeService(mapPanel, {
      logService,
      thumbnailService: { captureThumbnail: capture },
    });
    await service.onPlotOpened(DOC, plotFromFeatures(mapPanel.getCurrentFeatures()));

    const result = await service.refreshSceneThumbnail({
      documentUri: DOC,
      sceneId: fixture.sceneId,
      actor: ALICE,
    });
    expect(result.kind).toBe('thumbnail-failed');
    const plotAfter = JSON.stringify(plotFromFeatures(mapPanel.getCurrentFeatures()));
    expect(plotAfter).toBe(plotBefore);
    expect(logService.calls).toHaveLength(0);
    expect(service.getStaleFlag(DOC, fixture.sceneId)?.stale).toBe(true);
  });

  it('thumbnail-failed when service port is not wired', async () => {
    const service = makeService(mapPanel, { logService });
    const result = await service.refreshSceneThumbnail({
      documentUri: DOC,
      sceneId: fixture.sceneId,
      actor: ALICE,
    });
    expect(result.kind).toBe('thumbnail-failed');
  });
});

describe('StoryboardEditService — refreshAllStaleThumbnails (Phase 4, FR-EDIT-025)', () => {
  let mapPanel: InMemoryMapPanel;
  let logService: ReturnType<typeof makeLogService>;
  let fixture: Awaited<ReturnType<typeof seedFixture>>;

  beforeEach(async () => {
    mapPanel = new InMemoryMapPanel();
    logService = makeLogService();
    fixture = await seedFixture(mapPanel);
  });

  it('SC-012: iterates every stale Scene, invokes #174 once per, emits one card per refresh + one rollup', async () => {
    const capture = vi.fn(async (input: { sceneId: string }) => ({
      assetKey: `scene-thumbnail-${input.sceneId}-refreshed`,
    }));
    const service = makeService(mapPanel, {
      logService,
      thumbnailService: { captureThumbnail: capture },
    });
    // Both fixture scenes are stale (no track-1 in plot).
    await service.onPlotOpened(DOC, plotFromFeatures(mapPanel.getCurrentFeatures()));

    const result = await service.refreshAllStaleThumbnails({
      documentUri: DOC,
      storyboardId: fixture.storyboardId,
      actor: ALICE,
    });
    expect(result.succeeded).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
    expect(capture).toHaveBeenCalledTimes(2);
    // 2 refresh-thumbnail cards + 1 rollup = 3 log entries.
    const perScene = logService.calls.filter((c) => c.op === 'refresh-thumbnail');
    const rollups = logService.calls.filter((c) => c.op === 'refresh-all-stale');
    expect(perScene).toHaveLength(2);
    expect(rollups).toHaveLength(1);
  });

  it('continues on per-Scene failure, surfaces {succeeded, failed} tally', async () => {
    let n = 0;
    const capture = vi.fn(async (input: { sceneId: string }) => {
      n += 1;
      if (n === 1) {
        throw new Error('first refresh failed');
      }
      return { assetKey: `scene-thumbnail-${input.sceneId}-refreshed` };
    });
    const service = makeService(mapPanel, {
      logService,
      thumbnailService: { captureThumbnail: capture },
    });
    await service.onPlotOpened(DOC, plotFromFeatures(mapPanel.getCurrentFeatures()));

    const result = await service.refreshAllStaleThumbnails({
      documentUri: DOC,
      storyboardId: fixture.storyboardId,
      actor: ALICE,
    });
    expect(result.succeeded).toHaveLength(1);
    expect(result.failed).toHaveLength(1);
    expect(capture).toHaveBeenCalledTimes(2);
    // Still emits exactly one rollup.
    expect(
      logService.calls.filter((c) => c.op === 'refresh-all-stale'),
    ).toHaveLength(1);
  });

  it('no stale scenes → empty succeeded/failed + one rollup card', async () => {
    // Add the track-1 feature so scenes are no longer stale.
    const plot = plotFromFeatures(mapPanel.getCurrentFeatures());
    mapPanel.replaceAll(
      featuresFromPlot({
        ...plot,
        features: [
          ...plot.features,
          {
            type: 'Feature',
            id: 'track-1',
            properties: { id: 'track-1', kind: 'TRACK' },
            geometry: { type: 'Point', coordinates: [0, 0] },
          } as unknown as DebriefFeature,
        ],
      }),
    );
    const service = makeService(mapPanel, { logService });
    await service.onPlotOpened(DOC, plotFromFeatures(mapPanel.getCurrentFeatures()));

    const result = await service.refreshAllStaleThumbnails({
      documentUri: DOC,
      storyboardId: fixture.storyboardId,
      actor: ALICE,
    });
    expect(result.succeeded).toEqual([]);
    expect(result.failed).toEqual([]);
    expect(
      logService.calls.filter((c) => c.op === 'refresh-all-stale'),
    ).toHaveLength(1);
  });
});

describe('StoryboardEditService — onPlotClosed (Phase 5 T088/T089/T090 — SC-011)', () => {
  it('invokes sceneThumbnailService.gcOrphanAssets with the itemPath + final plot', async () => {
    const mapPanel = new InMemoryMapPanel();
    const fixture = await seedFixture(mapPanel);
    const gcCalls: { stacItemPath: string; plot: unknown }[] = [];
    const service = makeService(mapPanel, {
      thumbnailService: {
        gcOrphanAssets: async (stacItemPath, plot) => {
          gcCalls.push({ stacItemPath, plot });
          return { reclaimed: [] };
        },
      },
    });
    const finalPlot = plotFromFeatures(mapPanel.getCurrentFeatures());
    await service.onPlotClosed(DOC, finalPlot);
    expect(gcCalls).toHaveLength(1);
    expect(gcCalls[0]!.stacItemPath).toBe('/store/item');
    void fixture; // silence unused
  });

  it('swallows gc errors (no user-facing surface) and still drops per-plot state', async () => {
    const mapPanel = new InMemoryMapPanel();
    await seedFixture(mapPanel);
    const appendedLogs: string[] = [];
    const service = new StoryboardEditService({
      mapPanel,
      sessionManager: makeSessionManager(),
      thumbnailService: {
        gcOrphanAssets: async () => {
          throw new Error('disk i/o error');
        },
      },
      outputChannel: {
        appendLine: (line: string): void => {
          appendedLogs.push(line);
        },
      },
    });
    // Seed undo buffer + stale cache entries first.
    await service.onPlotOpened(DOC, plotFromFeatures(mapPanel.getCurrentFeatures()));

    await expect(
      service.onPlotClosed(DOC, plotFromFeatures(mapPanel.getCurrentFeatures())),
    ).resolves.toBeUndefined();
    expect(appendedLogs.join('\n')).toContain('gcOrphanAssets failed');
    // Cache + undo buffer dropped even on gc error.
    expect(service.getPendingDeletes(DOC)).toHaveLength(0);
  });

  it('no-ops gracefully when neither store context nor thumbnail service is wired', async () => {
    const mapPanel = new InMemoryMapPanel();
    await seedFixture(mapPanel);
    const service = new StoryboardEditService({
      mapPanel,
      sessionManager: {
        getActiveDocumentUri: (): string | null => DOC,
        resolveStoreContext: (): null => null,
      },
    });
    await expect(
      service.onPlotClosed(DOC, plotFromFeatures(mapPanel.getCurrentFeatures())),
    ).resolves.toBeUndefined();
  });
});

describe('StoryboardEditService — sanity: unknown scene guards', () => {
  it('renameScene throws UnknownSceneError for missing scene', async () => {
    const mapPanel = new InMemoryMapPanel();
    await seedFixture(mapPanel);
    const service = makeService(mapPanel);
    await expect(
      service.renameScene({
        documentUri: DOC,
        sceneId: 'ghost-scene',
        newTitle: 'x',
        actor: ALICE,
      }),
    ).rejects.toBeInstanceOf(UnknownSceneError);
  });

  it('duplicateScene throws UnknownSceneError for missing scene', async () => {
    const mapPanel = new InMemoryMapPanel();
    await seedFixture(mapPanel);
    const service = makeService(mapPanel);
    await expect(
      service.duplicateScene({
        documentUri: DOC,
        sceneId: 'ghost',
        newTimestamp: '2026-04-20T12:30:00Z',
        actor: ALICE,
      }),
    ).rejects.toBeInstanceOf(UnknownSceneError);
  });

  // #259 — DuplicateTimestampError class deleted from the storyboard module
  // along with the constraint it enforced.
});

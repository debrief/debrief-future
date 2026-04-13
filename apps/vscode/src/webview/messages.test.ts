/**
 * Message type discrimination tests for list-view messages (#129, T046).
 */

import { describe, it, expect } from 'vitest';
import type {
  LoadExerciseListMessage,
  LoadRecentPlotsMessage,
  RequestTrackDataMessage,
  TrackDataResponseMessage,
  OpenExerciseMessage,
  ExerciseListReadyMessage,
} from './messages';

describe('Exercise List View Messages', () => {
  it('LoadExerciseListMessage discriminates by type', () => {
    const msg: LoadExerciseListMessage = {
      type: 'loadExerciseList',
      items: [
        {
          id: 'ex-1',
          title: 'Exercise Alpha',
          itemPath: 'exercises/alpha/item.json',
          bbox: [-5, 49, 2, 52],
          datetime: '2024-03-15T08:00:00Z',
          startDatetime: '2024-03-15T08:00:00Z',
          endDatetime: '2024-03-17T18:00:00Z',
          platforms: [{ id: 'DEFENDER', name: 'HMS Defender', nationality: 'GB', vessel_class: 'surface/warship/destroyer', domain: 'surface' }],
          tags: ['training'],
          author: 'Jane Smith',
          trackDataHref: 'exercises/alpha/data.geojson',
        },
      ],
    };
    expect(msg.type).toBe('loadExerciseList');
    expect(msg.items).toHaveLength(1);
    expect(msg.items[0]!.title).toBe('Exercise Alpha');
  });

  it('LoadRecentPlotsMessage discriminates by type', () => {
    const msg: LoadRecentPlotsMessage = {
      type: 'loadRecentPlots',
      recentPlots: [
        {
          plotId: 'ex-1',
          title: 'Exercise Alpha',
          storeId: 'default-store',
          lastOpened: '2024-06-15T10:00:00Z',
          uri: 'debrief://store/default/exercises/alpha/item.json',
        },
      ],
    };
    expect(msg.type).toBe('loadRecentPlots');
    expect(msg.recentPlots).toHaveLength(1);
  });

  it('RequestTrackDataMessage discriminates by type', () => {
    const msg: RequestTrackDataMessage = {
      type: 'requestTrackData',
      itemId: 'ex-1',
      trackDataHref: 'exercises/alpha/data.geojson',
    };
    expect(msg.type).toBe('requestTrackData');
    expect(msg.itemId).toBe('ex-1');
  });

  it('TrackDataResponseMessage discriminates by type', () => {
    const msg: TrackDataResponseMessage = {
      type: 'trackDataResponse',
      itemId: 'ex-1',
      trackData: { type: 'FeatureCollection', features: [] },
    };
    expect(msg.type).toBe('trackDataResponse');
    expect(msg.trackData).toBeDefined();
  });

  it('OpenExerciseMessage discriminates by type', () => {
    const msg: OpenExerciseMessage = {
      type: 'openExercise',
      itemPath: 'exercises/alpha/item.json',
    };
    expect(msg.type).toBe('openExercise');
    expect(msg.itemPath).toBe('exercises/alpha/item.json');
  });

  it('ExerciseListReadyMessage discriminates by type', () => {
    const msg: ExerciseListReadyMessage = {
      type: 'exerciseListReady',
    };
    expect(msg.type).toBe('exerciseListReady');
  });
});

describe('Results Panel Messages (#178)', () => {
  it('ResultsSetTabsMessage round-trips through JSON', () => {
    const msg: import('./messages').ResultsSetTabsMessage = {
      type: 'results:setTabs',
      payload: {
        tabs: [
          {
            id: 'tab-1',
            title: 'Track Stats',
            toolId: 'track-stats',
            displayHint: 'table',
            tableData: [{ metric: 'speed', value: 12.5 }],
            isSaved: false,
          },
        ],
        activeTabId: 'tab-1',
      },
    };
    const round = JSON.parse(
      JSON.stringify(msg),
    ) as typeof msg;
    expect(round.type).toBe('results:setTabs');
    expect(round.payload.tabs).toHaveLength(1);
    expect(round.payload.tabs[0]!.id).toBe('tab-1');
    expect(round.payload.activeTabId).toBe('tab-1');
  });

  it('ResultsSetVisibilityMessage discriminates by type', () => {
    const msg: import('./messages').ResultsSetVisibilityMessage = {
      type: 'results:setVisibility',
      payload: { visible: true },
    };
    expect(msg.type).toBe('results:setVisibility');
    expect(msg.payload.visible).toBe(true);
  });

  it('ResultsSetLoadingMessage discriminates by type', () => {
    const msg: import('./messages').ResultsSetLoadingMessage = {
      type: 'results:setLoading',
      payload: { tabId: 'tab-1', isLoading: true },
    };
    expect(msg.type).toBe('results:setLoading');
  });

  it('ResultsWebviewReadyMessage discriminates by type', () => {
    const msg: import('./messages').ResultsWebviewReadyMessage = {
      type: 'results:webviewReady',
    };
    expect(msg.type).toBe('results:webviewReady');
  });

  it('ResultsSaveMessage round-trips through JSON', () => {
    const msg: import('./messages').ResultsSaveMessage = {
      type: 'results:save',
      payload: { tabId: 'tab-1' },
    };
    const round = JSON.parse(JSON.stringify(msg)) as typeof msg;
    expect(round.type).toBe('results:save');
    expect(round.payload.tabId).toBe('tab-1');
  });

  it('ResultsSaveAsMessage carries baseName and optional tag', () => {
    const msg: import('./messages').ResultsSaveAsMessage = {
      type: 'results:saveAs',
      payload: { tabId: 'tab-1', baseName: 'my-stats', tag: 'v2' },
    };
    expect(msg.payload.baseName).toBe('my-stats');
    expect(msg.payload.tag).toBe('v2');
  });

  it('ResultsRetryMessage discriminates by type', () => {
    const msg: import('./messages').ResultsRetryMessage = {
      type: 'results:retry',
      payload: { tabId: 'tab-1' },
    };
    expect(msg.type).toBe('results:retry');
  });

  it('ResultsCloseTabMessage discriminates by type', () => {
    const msg: import('./messages').ResultsCloseTabMessage = {
      type: 'results:closeTab',
      payload: { tabId: 'tab-1' },
    };
    expect(msg.type).toBe('results:closeTab');
  });
});

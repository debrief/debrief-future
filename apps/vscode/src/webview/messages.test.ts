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
          vesselClasses: ['Destroyer'],
          tags: ['training'],
          author: 'Jane Smith',
          nationalities: ['GB'],
          trackNames: ['HMS Defender'],
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

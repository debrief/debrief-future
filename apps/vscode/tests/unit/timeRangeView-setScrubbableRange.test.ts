/**
 * Unit tests for `TimeRangeViewProvider.setScrubbableRange` (#217 T150/T151).
 *
 * The override narrows the outbound `updateTimeExtent` message's
 * `start`/`end` to a scene window while keeping `dataStart`/`dataEnd`
 * pegged to the session's full `timeRange`. It must survive session-
 * state `timeRange` updates (repost continues to honour the override)
 * and clear cleanly on `setScrubbableRange(null, null)`.
 *
 * Uses the prototype-synthesis pattern from `mapPanel-setFeatures.test.ts`
 * / `mapPanel-storyboardPlayback.test.ts` to avoid spinning up a real
 * VS Code WebviewView.
 */

import { describe, it, expect, vi } from 'vitest';
import { TimeRangeViewProvider } from '../../src/views/timeRangeView';

interface TimeRangeViewInternals {
  _timeExtent: { start: number; end: number } | null;
  _scrubbableOverride: { start: number; end: number } | null;
  _isWebviewReady: boolean;
  _pendingMessages: Array<Record<string, unknown>>;
  _view: { webview: { postMessage: (msg: unknown) => void } };
  _handleTemporalChange(temporal: {
    timeRange: { start: number; end: number } | null;
    currentTime: number | null;
  }): void;
}

interface UpdateTimeExtentMsg {
  type: 'updateTimeExtent';
  start: number;
  end: number;
  dataStart: number;
  dataEnd: number;
}

function makeProvider(dataStart: number, dataEnd: number): {
  provider: TimeRangeViewProvider;
  internals: TimeRangeViewInternals;
  postMessage: ReturnType<typeof vi.fn>;
} {
  const provider = Object.create(TimeRangeViewProvider.prototype) as TimeRangeViewProvider;
  const internals = provider as unknown as TimeRangeViewInternals;
  const postMessage = vi.fn();
  internals._timeExtent = { start: dataStart, end: dataEnd };
  internals._scrubbableOverride = null;
  internals._isWebviewReady = true;
  internals._pendingMessages = [];
  internals._view = { webview: { postMessage } };
  return { provider, internals, postMessage };
}

function lastExtent(postMessage: ReturnType<typeof vi.fn>): UpdateTimeExtentMsg {
  const calls = postMessage.mock.calls as Array<[unknown]>;
  for (let i = calls.length - 1; i >= 0; i--) {
    const msg = calls[i]![0] as { type: string };
    if (msg.type === 'updateTimeExtent') {
      return msg as unknown as UpdateTimeExtentMsg;
    }
  }
  throw new Error('no updateTimeExtent messages posted');
}

describe('TimeRangeViewProvider.setScrubbableRange', () => {
  it('narrows outbound start/end to the override while keeping dataStart/dataEnd at the full range', () => {
    const { provider, postMessage } = makeProvider(1000, 10000);

    provider.setScrubbableRange(3000, 5000);

    const msg = lastExtent(postMessage);
    expect(msg).toEqual({
      type: 'updateTimeExtent',
      start: 3000,
      end: 5000,
      dataStart: 1000,
      dataEnd: 10000,
    });
  });

  it('setScrubbableRange(null, null) restores the full range on the next extent post', () => {
    const { provider, postMessage } = makeProvider(1000, 10000);

    provider.setScrubbableRange(3000, 5000);
    postMessage.mockClear();

    provider.setScrubbableRange(null, null);

    const msg = lastExtent(postMessage);
    expect(msg).toEqual({
      type: 'updateTimeExtent',
      start: 1000,
      end: 10000,
      dataStart: 1000,
      dataEnd: 10000,
    });
  });

  it('override survives a session-state timeRange update', () => {
    const { provider, internals, postMessage } = makeProvider(1000, 10000);
    provider.setScrubbableRange(3000, 5000);
    postMessage.mockClear();

    // Session-state emits a new time range; _handleTemporalChange reposts.
    internals._handleTemporalChange({
      timeRange: { start: 500, end: 20000 },
      currentTime: null,
    });

    const msg = lastExtent(postMessage);
    // dataStart/dataEnd track the new timeRange; override still applied.
    expect(msg).toEqual({
      type: 'updateTimeExtent',
      start: 3000,
      end: 5000,
      dataStart: 500,
      dataEnd: 20000,
    });
  });

  it('explicit updateTimeExtent() from extension host also honours the override', () => {
    const { provider, postMessage } = makeProvider(1000, 10000);
    provider.setScrubbableRange(3000, 5000);
    postMessage.mockClear();

    // E.g. IoService discovers a wider plot time range.
    provider.updateTimeExtent(200, 30000);

    const msg = lastExtent(postMessage);
    expect(msg).toEqual({
      type: 'updateTimeExtent',
      start: 3000,
      end: 5000,
      dataStart: 200,
      dataEnd: 30000,
    });
  });

  it('partial null input (one null, one non-null) is treated as a clear', () => {
    const { provider, postMessage } = makeProvider(1000, 10000);
    provider.setScrubbableRange(3000, 5000);
    postMessage.mockClear();

    // One null input clears the override (no partial windows supported).
    provider.setScrubbableRange(3000, null);

    const msg = lastExtent(postMessage);
    expect(msg).toEqual({
      type: 'updateTimeExtent',
      start: 1000,
      end: 10000,
      dataStart: 1000,
      dataEnd: 10000,
    });
  });

  it('clearing with null when no override is installed is a no-op', () => {
    const { provider, postMessage } = makeProvider(1000, 10000);
    postMessage.mockClear();

    provider.setScrubbableRange(null, null);

    expect(postMessage).not.toHaveBeenCalled();
  });
});

/**
 * Halted-state safety wrappers (T-FAILURE-MODES-ADAPTERS, T052).
 *
 * Per Article I.3 (no silent failures), any throw inside one of the
 * SPA's adapter surfaces must surface a visible "playback halted"
 * state — never a silent freeze. This file provides two helpers that
 * the SPA wraps every adapter call in:
 *
 *   - `withHaltGuard(adapter, name)` returns a proxied adapter where
 *     each method catches sync and async throws and forwards them to
 *     `useBriefingStore.halt({ kind: 'adapter', ... })`.
 *
 *   - `guardTween(promise)` catches the async `done` Promise rejection
 *     from `runTimeRangeTween` (#263) so the playback driver doesn't
 *     leave the SPA in a half-tween state on error.
 *
 * Adapter throws and tween rejections both land in the same store
 * slice (`bootState === 'halted'`), and `App.tsx` renders a clear
 * message identifying the surface that threw.
 */

import { useBriefingStore } from '../store';
import type { HaltedReason } from '../types';

export type AnyFn = (...args: unknown[]) => unknown;
export type AnyRecord = Record<string | symbol, unknown>;

/**
 * Wrap an adapter so every method call is funnelled through a try/catch
 * that transitions the store to 'halted' on error. Sync and async paths
 * are both covered.
 */
export function withHaltGuard<T extends AnyRecord>(adapter: T, adapterName: string): T {
  return new Proxy(adapter, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;
      const fn = value as AnyFn;
      return (...args: unknown[]): unknown => {
        try {
          const out = fn.apply(target, args);
          // Catch async errors too.
          if (out && typeof (out as { then?: unknown }).then === 'function') {
            return (out as Promise<unknown>).catch((e: unknown) => {
              haltFromError(adapterName, e);
              throw e;
            });
          }
          return out;
        } catch (e) {
          haltFromError(adapterName, e);
          throw e;
        }
      };
    },
  }) as T;
}

function haltFromError(adapterName: string, e: unknown): void {
  const message = e instanceof Error ? e.message : String(e);
  const reason: HaltedReason = { kind: 'adapter', adapter: adapterName, message };
  useBriefingStore.getState().halt(reason);
}

/**
 * Catch a tween's async `done` Promise rejection (T053). The caller
 * should still `await` the returned promise to know when the tween
 * completes; the SPA never re-throws — instead it transitions to the
 * halted state.
 */
export async function guardTween(p: Promise<unknown>, tweenLabel = 'time-range tween'): Promise<void> {
  try {
    await p;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    useBriefingStore
      .getState()
      .halt({ kind: 'tween', message: `${tweenLabel}: ${message}` });
  }
}

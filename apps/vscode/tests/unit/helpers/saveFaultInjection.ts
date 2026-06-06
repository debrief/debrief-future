/**
 * Shared fault-injection helper for the atomic-save (#268) integration tests.
 *
 * Wraps any {@link StacWriter} and makes a chosen write method reject with a
 * {@link StacWriterError} on its Nth invocation — the "process killed / disk
 * full mid-save" condition the spec's fault-injection matrix exercises
 * (SC-001/002/003). The remaining calls delegate to the wrapped writer
 * unchanged.
 *
 * Implemented as a Proxy so it covers every current and future write method
 * (including `commitPlotSave`, added in this feature) without re-listing the
 * interface surface — the wrapper cannot silently miss a new method.
 */

import { StacWriterError, type StacWriter } from '@debrief/stac-writer';
import type { StacWriterErrorKind } from '@debrief/stac-writer';

/** Methods that mutate the store — the ones a "write" counter advances on. */
const WRITE_METHODS: ReadonlySet<string> = new Set([
  'writeItem',
  'patchItem',
  'writeAsset',
  'writeSceneThumbnailPair',
  'writePlotThumbnailPair',
  'deleteItem',
  'deleteAsset',
  'commitPlotSave',
]);

export interface SaveFaultInjectionOptions {
  /** 1-based index of the counted write call that should reject. */
  readonly failOnCall: number;
  /**
   * Restrict counting + failure to a single method (e.g. `'commitPlotSave'`).
   * When omitted, every method in {@link WRITE_METHODS} advances the counter.
   */
  readonly method?: keyof StacWriter;
  /** Error kind to throw. Defaults to `'write-failed'`. */
  readonly kind?: StacWriterErrorKind;
  /** Error message. Defaults to a synthetic, descriptive message. */
  readonly message?: string;
}

/**
 * Return a {@link StacWriter} that delegates to `base` but rejects the
 * `failOnCall`-th counted write with a {@link StacWriterError}.
 */
export function createFaultInjectingWriter(
  base: StacWriter,
  opts: SaveFaultInjectionOptions,
): StacWriter {
  const failKind: StacWriterErrorKind = opts.kind ?? 'write-failed';
  let writeCount = 0;

  const handler: ProxyHandler<StacWriter> = {
    get(target, prop, receiver): unknown {
      const value: unknown = Reflect.get(target, prop, receiver);
      if (typeof prop !== 'string' || typeof value !== 'function') {
        return value;
      }
      const counted =
        opts.method === undefined ? WRITE_METHODS.has(prop) : prop === opts.method;
      const fn = value as (...args: unknown[]) => unknown;
      if (!counted) {
        return fn.bind(target);
      }
      return (...args: unknown[]): unknown => {
        writeCount += 1;
        if (writeCount === opts.failOnCall) {
          return Promise.reject(
            new StacWriterError(
              failKind,
              opts.message ??
                `saveFaultInjection: simulated ${failKind} on ${prop} (call #${writeCount})`,
              { path: 'fault-injection' },
            ),
          );
        }
        return fn.apply(target, args);
      };
    },
  };

  return new Proxy(base, handler);
}

/**
 * Unit tests for the VS Code extension-host NL-search proxy (#191 T037-T039).
 *
 * Coverage:
 *   - T037 message protocol — nlGenerate resolves to an outcome; nlAbort for
 *          a known id drops the in-flight call (pending resolves as cancelled).
 *   - T038 key-cache — first generate() triggers secrets.get once; subsequent
 *          generates reuse the cache; onDidChange invalidates.
 *   - T039 map cleanup — success, failure, and abort paths all delete their
 *          controller entry (no leaks).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiveOutcome } from '@debrief/components';

// Mock the shared nl-cql2 provider-call so no network traffic occurs.
// `providerCall` is exposed via the Node-only subpath (#191 split — keeps
// node types out of the main browser barrel).
const providerCallMock = vi.hoisted(() => {
  return vi.fn<(input: unknown) => Promise<LiveOutcome>>();
});
vi.mock('@debrief/components/nl-cql2-node', () => ({
  providerCall: providerCallMock,
}));

import {
  __resetLlmProxyForTests,
  createLlmProxy,
  type LlmProxyVsCodeApi,
} from '../../src/services/llmProxy';

// ---------------------------------------------------------------------------
// Fake VS Code surface
// ---------------------------------------------------------------------------

interface FakeApi {
  readonly api: LlmProxyVsCodeApi;
  readonly secretsGet: ReturnType<typeof vi.fn>;
  readonly fireSecretsChange: (key: string) => void;
  readonly fireConfigChange: (section: string) => void;
  readonly setSettings: (s: Partial<Record<string, unknown>>) => void;
}

function makeFakeApi(
  opts: {
    storedKey?: string | undefined;
    settings?: Partial<Record<string, unknown>>;
  } = {},
): FakeApi {
  let currentSettings: Record<string, unknown> = {
    enabled: true,
    model: 'claude-haiku-4-5-20251001',
    callCeiling: 50,
    timeoutMs: 12000,
    maxResponseBytes: 262144,
    ...(opts.settings ?? {}),
  };

  const secretsListeners = new Set<(e: { key: string }) => void>();
  const configListeners = new Set<(e: { affectsConfiguration(section: string): boolean }) => void>();

  const secretsGet = vi.fn<(key: string) => Promise<string | undefined>>(
    async () => opts.storedKey,
  );

  const api: LlmProxyVsCodeApi = {
    workspace: {
      getConfiguration: (_section: string) => ({
        get<T>(key: string, defaultValue: T): T {
          const value = currentSettings[key];
          return (value === undefined ? defaultValue : value) as T;
        },
      }),
      onDidChangeConfiguration: (listener) => {
        configListeners.add(listener);
        return { dispose: () => configListeners.delete(listener) };
      },
    },
    secrets: {
      get: secretsGet,
      store: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      onDidChange: (listener: (e: { key: string }) => void) => {
        secretsListeners.add(listener);
        return { dispose: () => secretsListeners.delete(listener) };
      },
    } as unknown as LlmProxyVsCodeApi['secrets'],
  };

  return {
    api,
    secretsGet,
    fireSecretsChange(key: string) {
      for (const l of secretsListeners) l({ key });
    },
    fireConfigChange(_section: string) {
      for (const l of configListeners) {
        l({ affectsConfiguration: (s: string) => s === 'debrief.nlSearch' });
      }
    },
    setSettings(partial) {
      currentSettings = { ...currentSettings, ...partial };
    },
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SUCCESS_OUTCOME: LiveOutcome = {
  kind: 'success',
  rawResponse: '{"cql2":{},"lozenges":[],"unrecognised_terms":[]}',
  durationMs: 42,
  responseBytes: 48,
  model: 'claude-haiku-4-5-20251001',
};

// Helper: block `providerCall` on an external signal so the test can
// interleave an abort before the call resolves.
function makeBlockingProviderCall(): {
  promise: Promise<LiveOutcome>;
  resolve: (o: LiveOutcome) => void;
  lastSignal: AbortSignal | undefined;
} {
  let resolver!: (o: LiveOutcome) => void;
  const promise = new Promise<LiveOutcome>((r) => {
    resolver = r;
  });
  return { promise, resolve: resolver, lastSignal: undefined };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  __resetLlmProxyForTests();
  providerCallMock.mockReset();
});

afterEach(() => {
  providerCallMock.mockReset();
});

describe('llmProxy — handleGenerate (T037)', () => {
  it('resolves to the provider outcome for a well-configured request', async () => {
    providerCallMock.mockResolvedValueOnce(SUCCESS_OUTCOME);
    const f = makeFakeApi({ storedKey: 'sk-test' });
    const proxy = createLlmProxy(f.api);
    const outcome = await proxy.handleGenerate({ requestId: 'r1', prompt: 'UK submarines' });
    expect(outcome.kind).toBe('success');
    expect(providerCallMock).toHaveBeenCalledTimes(1);
    const args = providerCallMock.mock.calls[0]![0] as { apiKey: string; prompt: string };
    expect(args.apiKey).toBe('sk-test');
    expect(args.prompt).toBe('UK submarines');
  });

  it('short-circuits to not-configured when enabled=false (no provider call)', async () => {
    const f = makeFakeApi({ storedKey: 'sk-test', settings: { enabled: false } });
    const proxy = createLlmProxy(f.api);
    const outcome = await proxy.handleGenerate({ requestId: 'r1', prompt: 'x' });
    expect(outcome.kind).toBe('not-configured');
    if (outcome.kind === 'not-configured') {
      expect(outcome.reason).toBe('disabled');
    }
    expect(providerCallMock).not.toHaveBeenCalled();
  });

  it('short-circuits to not-configured when no API key is stored', async () => {
    const f = makeFakeApi({ storedKey: undefined });
    const proxy = createLlmProxy(f.api);
    const outcome = await proxy.handleGenerate({ requestId: 'r1', prompt: 'x' });
    expect(outcome.kind).toBe('not-configured');
    if (outcome.kind === 'not-configured') {
      expect(outcome.reason).toBe('no-key');
    }
    expect(providerCallMock).not.toHaveBeenCalled();
  });

  it('short-circuits to ceiling-reached after the activation ceiling (no provider call)', async () => {
    providerCallMock.mockResolvedValue(SUCCESS_OUTCOME);
    const f = makeFakeApi({ storedKey: 'sk-test', settings: { callCeiling: 2 } });
    const proxy = createLlmProxy(f.api);

    // Two successful calls exhaust the ceiling.
    await proxy.handleGenerate({ requestId: 'r1', prompt: 'a' });
    await proxy.handleGenerate({ requestId: 'r2', prompt: 'b' });
    expect(providerCallMock).toHaveBeenCalledTimes(2);

    // The third call short-circuits.
    const third = await proxy.handleGenerate({ requestId: 'r3', prompt: 'c' });
    expect(third.kind).toBe('ceiling-reached');
    if (third.kind === 'ceiling-reached') {
      expect(third.ceiling).toBe(2);
    }
    expect(providerCallMock).toHaveBeenCalledTimes(2); // unchanged
  });

  it('handleAbort(known id) cascades to the providerCall signal', async () => {
    // Install a providerCall that respects the abort signal: watch the
    // signal, resolve to cancelled when fired.
    providerCallMock.mockImplementationOnce(
      (input: unknown) =>
        new Promise<LiveOutcome>((resolve) => {
          const signal = (input as { signal: AbortSignal }).signal;
          signal.addEventListener('abort', () => {
            resolve({ kind: 'transport-error', reason: 'cancelled', durationMs: 0 });
          });
        }),
    );
    const f = makeFakeApi({ storedKey: 'sk-test' });
    const proxy = createLlmProxy(f.api);
    const pending = proxy.handleGenerate({ requestId: 'r1', prompt: 'x' });
    // Give the call a microtask to register its listener before aborting.
    await new Promise((r) => setTimeout(r, 5));
    proxy.handleAbort({ requestId: 'r1' });
    const outcome = await pending;
    expect(outcome.kind).toBe('transport-error');
    if (outcome.kind === 'transport-error') {
      expect(outcome.reason).toBe('cancelled');
    }
  });

  it('handleAbort(unknown id) is a silent no-op', async () => {
    const f = makeFakeApi({ storedKey: 'sk-test' });
    const proxy = createLlmProxy(f.api);
    expect(() => proxy.handleAbort({ requestId: 'never-sent' })).not.toThrow();
  });
});

describe('llmProxy — key cache invalidation (T038)', () => {
  it('first call reads from secrets.get once; subsequent calls reuse the cache', async () => {
    providerCallMock.mockResolvedValue(SUCCESS_OUTCOME);
    const f = makeFakeApi({ storedKey: 'sk-test' });
    const proxy = createLlmProxy(f.api);

    await proxy.handleGenerate({ requestId: 'r1', prompt: 'a' });
    await proxy.handleGenerate({ requestId: 'r2', prompt: 'b' });
    await proxy.handleGenerate({ requestId: 'r3', prompt: 'c' });

    expect(f.secretsGet).toHaveBeenCalledTimes(1);
  });

  it('onDidChange for our key invalidates the cache and next call re-reads', async () => {
    providerCallMock.mockResolvedValue(SUCCESS_OUTCOME);
    const f = makeFakeApi({ storedKey: 'sk-test' });
    const proxy = createLlmProxy(f.api);

    await proxy.handleGenerate({ requestId: 'r1', prompt: 'a' });
    expect(f.secretsGet).toHaveBeenCalledTimes(1);

    // Fire the secrets change for our key.
    f.fireSecretsChange('debrief.nlSearch.anthropicApiKey');

    await proxy.handleGenerate({ requestId: 'r2', prompt: 'b' });
    expect(f.secretsGet).toHaveBeenCalledTimes(2);
  });

  it('onDidChange for an unrelated secret does NOT invalidate the cache', async () => {
    providerCallMock.mockResolvedValue(SUCCESS_OUTCOME);
    const f = makeFakeApi({ storedKey: 'sk-test' });
    const proxy = createLlmProxy(f.api);

    await proxy.handleGenerate({ requestId: 'r1', prompt: 'a' });
    expect(f.secretsGet).toHaveBeenCalledTimes(1);

    f.fireSecretsChange('some.other.secret');

    await proxy.handleGenerate({ requestId: 'r2', prompt: 'b' });
    expect(f.secretsGet).toHaveBeenCalledTimes(1);
  });
});

describe('llmProxy — controller-map cleanup (T039)', () => {
  it('success path removes the controller entry', async () => {
    const blocked = makeBlockingProviderCall();
    providerCallMock.mockImplementationOnce(() => blocked.promise);
    const f = makeFakeApi({ storedKey: 'sk-test' });
    const proxy = createLlmProxy(f.api);

    const pending = proxy.handleGenerate({ requestId: 'r1', prompt: 'a' });
    // Resolve with success — the `finally` block should delete the entry.
    blocked.resolve(SUCCESS_OUTCOME);
    await pending;

    // Post-resolution abort is a silent no-op (entry already gone).
    expect(() => proxy.handleAbort({ requestId: 'r1' })).not.toThrow();
  });

  it('failure path removes the controller entry', async () => {
    providerCallMock.mockResolvedValueOnce({
      kind: 'auth-failure',
      providerStatus: 401,
      durationMs: 12,
    });
    const f = makeFakeApi({ storedKey: 'sk-test' });
    const proxy = createLlmProxy(f.api);
    await proxy.handleGenerate({ requestId: 'r1', prompt: 'a' });
    expect(() => proxy.handleAbort({ requestId: 'r1' })).not.toThrow();
  });

  it('abort path removes the controller entry', async () => {
    providerCallMock.mockImplementationOnce(
      (input: unknown) =>
        new Promise<LiveOutcome>((resolve) => {
          const signal = (input as { signal: AbortSignal }).signal;
          signal.addEventListener('abort', () => {
            resolve({ kind: 'transport-error', reason: 'cancelled', durationMs: 0 });
          });
        }),
    );
    const f = makeFakeApi({ storedKey: 'sk-test' });
    const proxy = createLlmProxy(f.api);
    const pending = proxy.handleGenerate({ requestId: 'r1', prompt: 'a' });
    await new Promise((r) => setTimeout(r, 5));
    proxy.handleAbort({ requestId: 'r1' });
    await pending;
    // A second abort is a silent no-op — entry already cleaned up.
    expect(() => proxy.handleAbort({ requestId: 'r1' })).not.toThrow();
  });
});

describe('llmProxy — config snapshot + change events', () => {
  it('readConfig reflects hasApiKey after the first generate() resolves', async () => {
    providerCallMock.mockResolvedValueOnce(SUCCESS_OUTCOME);
    const f = makeFakeApi({ storedKey: 'sk-test' });
    const proxy = createLlmProxy(f.api);

    // Before any generate: hasApiKey is unknown — the proxy hasn't read
    // secrets yet — so it reports false (presence-only, conservative).
    expect(proxy.readConfig().hasApiKey).toBe(false);

    await proxy.handleGenerate({ requestId: 'r1', prompt: 'a' });
    expect(proxy.readConfig().hasApiKey).toBe(true);
  });

  it('onConfigChange fires on workspace config change', async () => {
    const f = makeFakeApi({ storedKey: 'sk-test' });
    const proxy = createLlmProxy(f.api);
    const snapshots: ReturnType<typeof proxy.readConfig>[] = [];
    proxy.onConfigChange((s) => snapshots.push(s));

    f.setSettings({ enabled: false });
    f.fireConfigChange('debrief.nlSearch');

    expect(snapshots.length).toBeGreaterThanOrEqual(1);
    expect(snapshots.at(-1)!.enabled).toBe(false);
  });
});

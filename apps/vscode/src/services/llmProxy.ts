/**
 * VS Code extension-host proxy for NL → CQL2 calls (#191 Phase 3 — Decisions
 * 13, 14, 15).
 *
 * Bridges webview `nlGenerate` messages to the shared `providerCall` core,
 * owns the API-key cache + per-request `AbortController` map + session call
 * counter. The API key NEVER crosses the webview boundary — it lives only
 * inside this module's process memory (sourced from `context.secrets`).
 *
 * Lifecycle:
 *   - Lazy-init: the singleton is created on first `nlGenerate` message,
 *     not at extension `activate()` (review Decision 13 — keeps activation
 *     cost near-zero for users who never enable NL search).
 *   - Key cache: hydrated from `context.secrets.get` on first use,
 *     invalidated on `context.secrets.onDidChange`.
 *   - Request map: every `providerCall` resolution removes its entry in a
 *     `finally` block — success, failure, and abort paths are all covered.
 *
 * Structured logging: one `[nl-search/live]` record per outcome carrying
 * timestamp, provider, model, durationMs, outcome kind, responseBytes, and
 * callIndex. NEVER prompt, response, or credential content.
 */

import type * as vscode from 'vscode';
import { providerCall } from '@debrief/components';
import type {
  LiveOutcome,
  TransportCallRecord,
} from '@debrief/components';
import type {
  NlLiveOutcome,
  NlLiveConfigMessage,
} from '../webview/messages';

// ---------------------------------------------------------------------------
// Config constants
// ---------------------------------------------------------------------------

const CONFIG_SECTION = 'debrief.nlSearch';
const SECRET_KEY = 'debrief.nlSearch.anthropicApiKey';

const DEFAULTS = {
  enabled: false,
  model: 'claude-haiku-4-5-20251001',
  callCeiling: 50,
  timeoutMs: 12_000,
  maxResponseBytes: 262_144,
} as const;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Host-side NL-search config snapshot. Mirrors `NlLiveConfigMessage['config']`
 * but retains a private `apiKey` that NEVER leaves the host.
 */
export interface HostLiveConfig {
  readonly enabled: boolean;
  readonly model: string;
  readonly callCeiling: number;
  readonly timeoutMs: number;
  readonly maxResponseBytes: number;
  readonly hasApiKey: boolean;
}

/**
 * Public surface of the extension-host proxy. Kept intentionally small:
 * webview-protocol handlers call `handleGenerate` / `handleAbort` with the
 * parsed message payload, the proxy resolves an outcome (never throws).
 */
export interface LlmProxy {
  handleGenerate(params: { requestId: string; prompt: string }): Promise<NlLiveOutcome>;
  handleAbort(params: { requestId: string }): void;
  /** Read the current config snapshot for pushing to the webview. */
  readConfig(): HostLiveConfig;
  /** Register a listener; fires whenever the snapshot changes. */
  onConfigChange(listener: (snapshot: HostLiveConfig) => void): vscode.Disposable;
  dispose(): void;
}

// ---------------------------------------------------------------------------
// Minimal VS Code API shape the proxy needs (makes the service unit-testable
// without relying on the full vscode module surface).
// ---------------------------------------------------------------------------

export interface LlmProxyVsCodeApi {
  workspace: {
    getConfiguration(section: string): {
      get<T>(key: string, defaultValue: T): T;
    };
    onDidChangeConfiguration(
      listener: (e: { affectsConfiguration(section: string): boolean }) => void,
    ): vscode.Disposable;
  };
  secrets: vscode.SecretStorage;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Build an `LlmProxy` bound to the supplied VS Code surface. The returned
 * object is stateful (caches the key in memory, holds in-flight controllers,
 * counts session calls) — callers should build exactly one per extension
 * activation. `getLlmProxy(context)` below wraps this with the lazy-init
 * singleton protocol per review Decision 13.
 */
export function createLlmProxy(vscodeApi: LlmProxyVsCodeApi): LlmProxy {
  const disposables: vscode.Disposable[] = [];
  const configListeners = new Set<(snapshot: HostLiveConfig) => void>();
  const controllers = new Map<string, AbortController>();
  let cachedKey: string | null | undefined = undefined; // undefined = not yet read; null = read, not present
  let callsUsed = 0;

  // Key-cache invalidation: clear the cache on every secrets change so the
  // next `nlGenerate` re-reads. (Review Decision 14.)
  const secretsChangeListener = vscodeApi.secrets.onDidChange?.((e) => {
    if (e.key === SECRET_KEY) {
      cachedKey = undefined;
      fireConfigChange();
    }
  });
  if (secretsChangeListener) disposables.push(secretsChangeListener);

  // Re-emit config snapshots whenever the user touches the settings.
  const configChangeListener = vscodeApi.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(CONFIG_SECTION)) {
      fireConfigChange();
    }
  });
  disposables.push(configChangeListener);

  function readSettings(): Omit<HostLiveConfig, 'hasApiKey'> {
    const cfg = vscodeApi.workspace.getConfiguration(CONFIG_SECTION);
    return {
      enabled: cfg.get<boolean>('enabled', DEFAULTS.enabled),
      model: cfg.get<string>('model', DEFAULTS.model),
      callCeiling: cfg.get<number>('callCeiling', DEFAULTS.callCeiling),
      timeoutMs: cfg.get<number>('timeoutMs', DEFAULTS.timeoutMs),
      maxResponseBytes: cfg.get<number>('maxResponseBytes', DEFAULTS.maxResponseBytes),
    };
  }

  async function readApiKey(): Promise<string | null> {
    if (cachedKey !== undefined) return cachedKey;
    const value = await vscodeApi.secrets.get(SECRET_KEY);
    const resolved: string | null = value ?? null;
    cachedKey = resolved;
    return resolved;
  }

  function readConfigSync(): HostLiveConfig {
    return { ...readSettings(), hasApiKey: cachedKey !== null && cachedKey !== undefined };
  }

  function fireConfigChange(): void {
    const snapshot = readConfigSync();
    for (const listener of configListeners) {
      try {
        listener(snapshot);
      } catch {
        // Subscriber errors must not corrupt our state.
      }
    }
  }

  function emitRecord(record: TransportCallRecord): void {
    if (typeof console !== 'undefined' && typeof console.info === 'function') {
      console.info('[nl-search/live]', record);
    }
  }

  async function handleGenerate(params: {
    requestId: string;
    prompt: string;
  }): Promise<NlLiveOutcome> {
    const settings = readSettings();

    // Host-side short-circuits (review Decision 6 additions).
    if (!settings.enabled) {
      const outcome: LiveOutcome = { kind: 'not-configured', reason: 'disabled', durationMs: 0 };
      emitRecord(makeRecord(outcome, settings.model, 0));
      return outcome;
    }

    const apiKey = await readApiKey();
    if (apiKey === null || apiKey === undefined || apiKey === '') {
      const outcome: LiveOutcome = { kind: 'not-configured', reason: 'no-key', durationMs: 0 };
      emitRecord(makeRecord(outcome, settings.model, 0));
      fireConfigChange(); // hasApiKey boolean changed if webview was out of sync
      return outcome;
    }

    // Per-activation ceiling — short-circuits BEFORE the network call
    // (review Decision 15).
    if (callsUsed >= settings.callCeiling) {
      const outcome: LiveOutcome = {
        kind: 'ceiling-reached',
        ceiling: settings.callCeiling,
        durationMs: 0,
      };
      emitRecord(makeRecord(outcome, settings.model, callsUsed));
      return outcome;
    }

    const callIndex = callsUsed;
    callsUsed += 1;

    const controller = new AbortController();
    controllers.set(params.requestId, controller);

    try {
      const outcome = await providerCall({
        prompt: params.prompt,
        model: settings.model,
        apiKey,
        timeoutMs: settings.timeoutMs,
        maxResponseBytes: settings.maxResponseBytes,
        signal: controller.signal,
        callIndex,
      });
      emitRecord(makeRecord(outcome, settings.model, callIndex));
      return outcome;
    } finally {
      // Always clean up the controller map — success, failure, abort.
      controllers.delete(params.requestId);
    }
  }

  function handleAbort(params: { requestId: string }): void {
    const ctrl = controllers.get(params.requestId);
    if (!ctrl) return;
    try {
      ctrl.abort();
    } catch {
      // Best-effort.
    }
    controllers.delete(params.requestId);
  }

  function readConfig(): HostLiveConfig {
    return readConfigSync();
  }

  function onConfigChange(
    listener: (snapshot: HostLiveConfig) => void,
  ): vscode.Disposable {
    configListeners.add(listener);
    return { dispose: () => configListeners.delete(listener) } as vscode.Disposable;
  }

  function dispose(): void {
    for (const d of disposables) {
      try {
        d.dispose();
      } catch {
        // Best-effort.
      }
    }
    controllers.clear();
    configListeners.clear();
    cachedKey = undefined;
  }

  return { handleGenerate, handleAbort, readConfig, onConfigChange, dispose };
}

function makeRecord(
  outcome: LiveOutcome,
  model: string,
  callIndex: number,
): TransportCallRecord {
  let responseBytes: number | null = null;
  if (outcome.kind === 'success') {
    responseBytes = outcome.responseBytes;
  }
  return {
    ts: new Date().toISOString(),
    provider: 'anthropic',
    model,
    durationMs: outcome.durationMs,
    outcome: outcome.kind,
    responseBytes,
    callIndex,
  };
}

// ---------------------------------------------------------------------------
// Lazy-init singleton (review Decision 13)
// ---------------------------------------------------------------------------

let lazyInstance: LlmProxy | null = null;

/**
 * Return the proxy singleton, constructing it on first call. Extension
 * `activate()` does NOT call this — it only registers the `nlGenerate` /
 * `nlAbort` message handlers. The first `nlGenerate` message is what
 * materialises the proxy, keeping activation cost near-zero for users who
 * never enable NL search.
 */
export function getLlmProxy(
  context: vscode.ExtensionContext,
  vscodeApi: Pick<LlmProxyVsCodeApi, 'workspace'> & {
    secrets?: vscode.SecretStorage;
  },
): LlmProxy {
  if (lazyInstance) return lazyInstance;
  const api: LlmProxyVsCodeApi = {
    workspace: vscodeApi.workspace,
    secrets: vscodeApi.secrets ?? context.secrets,
  };
  lazyInstance = createLlmProxy(api);
  context.subscriptions.push({ dispose: () => lazyInstance?.dispose() });
  return lazyInstance;
}

/** Test-only — resets the singleton so each test starts fresh. */
export function __resetLlmProxyForTests(): void {
  lazyInstance?.dispose();
  lazyInstance = null;
}

/**
 * Helper used by the extension-host message router to convert an
 * `LlmProxy.readConfig()` snapshot into the typed `nlConfig` message.
 */
export function makeNlConfigMessage(snapshot: HostLiveConfig): NlLiveConfigMessage {
  return {
    type: 'nlConfig',
    config: {
      enabled: snapshot.enabled,
      model: snapshot.model,
      hasApiKey: snapshot.hasApiKey,
      callCeiling: snapshot.callCeiling,
      timeoutMs: snapshot.timeoutMs,
      maxResponseBytes: snapshot.maxResponseBytes,
    },
  };
}

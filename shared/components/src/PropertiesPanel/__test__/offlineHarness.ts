/**
 * Offline-invariant test harness — throws `OfflineInvariantError` on any
 * `fetch` or `XMLHttpRequest` attempted by PropertiesPanel code during unit
 * tests (FR-010, Decision 10, SC-005).
 *
 * Installed via vitest `setupFiles` so the invariant is enforced for every
 * test in `@debrief/components` without per-file boilerplate.
 */

export class OfflineInvariantError extends Error {
  constructor(resource: string) {
    super(
      `OfflineInvariantError: network call blocked during PropertiesPanel tests — ${resource}`,
    );
    this.name = 'OfflineInvariantError';
  }
}

const shouldSkipInstall = (): boolean => {
  // Allow opt-out via env var for harnesses that genuinely need the network
  // (e.g. Storybook docs build).
  const env =
    (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
      ?.env;
  return env?.PROPERTIES_PANEL_OFFLINE_HARNESS === 'off';
};

let installed = false;

export function installOfflineHarness(): void {
  if (installed || shouldSkipInstall()) return;
  installed = true;

  const globalObj = globalThis as unknown as {
    fetch?: unknown;
    XMLHttpRequest?: unknown;
  };

  globalObj.fetch = ((input: RequestInfo | URL): Promise<Response> => {
    const resource = typeof input === 'string' ? input : input.toString();
    return Promise.reject(new OfflineInvariantError(resource));
  }) as typeof fetch;

  class BlockedXMLHttpRequest {
    open(_method: string, url: string): void {
      throw new OfflineInvariantError(url);
    }
  }
  globalObj.XMLHttpRequest = BlockedXMLHttpRequest;
}

export function uninstallOfflineHarness(): void {
  installed = false;
}

// Install immediately when imported via setupFiles.
installOfflineHarness();

/**
 * `debrief.storyboard.preview` — VS Code command handler (#273, US1).
 *
 * Scopes the active storyboard's features (via the shared `scopeStoryboard`
 * core — FR-017/C-E1), hands them to the loopback `BriefingPreviewServer`,
 * and opens the system browser at the loopback URL run through
 * `asExternalUri` (so it is correct under Remote/Codespaces tunnels). Fully
 * offline: the server binds loopback only and serves the bundled renderer.
 *
 * Every external touch is injected so the orchestration is unit-testable
 * without a VS Code host.
 */

import { scopeStoryboard, StoryboardNotFoundError } from '../services/briefingZipExport';
import { plotFromFeatures } from '../services/plotFromFeatures';

export interface PreviewStoryboardArgs {
  /** ULID of the StoryboardFeature to preview (the panel's active one). */
  readonly storyboardId: string;
}

export interface PreviewStoryboardDeps {
  /** The current plot's features (typically `mapPanel.getCurrentFeatures()`). */
  getPlotFeatures(): readonly unknown[];
  /** The shared loopback preview server. */
  readonly server: {
    setFeatures(featuresJson: string): void;
    start(): Promise<number>;
    getPreviewUrl(): string;
  };
  /** Wraps `vscode.env.asExternalUri` (loopback → tunnel-correct URL). */
  asExternalUri(url: string): Promise<string>;
  /** Wraps `vscode.env.openExternal`; resolves false when the browser
   *  could not be opened (FR-009). */
  openExternal(url: string): Promise<boolean>;
  /** Surfaces a human-readable error to the analyst. */
  showError(message: string): void;
}

export async function previewStoryboard(
  args: PreviewStoryboardArgs,
  deps: PreviewStoryboardDeps,
): Promise<void> {
  // eslint-disable-next-line no-restricted-syntax -- mapPanel features ↔ StoryboardPlot boundary; mirrors storyboardPanelView/plotFromFeatures usage.
  const plot = plotFromFeatures(deps.getPlotFeatures() as Parameters<typeof plotFromFeatures>[0]);

  let scoped;
  try {
    scoped = scopeStoryboard(plot, args.storyboardId);
  } catch (e) {
    if (e instanceof StoryboardNotFoundError) {
      deps.showError(`Storyboard not found in the active plot (id: ${args.storyboardId}).`);
      return;
    }
    deps.showError(`Could not prepare the storyboard preview: ${(e as Error).message}`);
    return;
  }

  // C-B6 — never launch an empty player; mirror the panel's `canPreview`.
  if (scoped.scenes.length === 0) {
    deps.showError('Add at least one scene to this storyboard before previewing it.');
    return;
  }

  deps.server.setFeatures(JSON.stringify(scoped.fc));
  await deps.server.start();
  const localUrl = deps.server.getPreviewUrl();

  let externalUrl: string;
  try {
    externalUrl = await deps.asExternalUri(localUrl);
  } catch (e) {
    deps.showError(`Could not resolve the preview URL: ${(e as Error).message}`);
    return;
  }

  const opened = await deps.openExternal(externalUrl);
  if (!opened) {
    deps.showError(
      'Could not open a browser tab for the preview. Check your default browser settings and try again.',
    );
  }
}

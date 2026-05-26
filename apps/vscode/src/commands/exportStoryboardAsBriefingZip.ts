/**
 * `debrief.storyboard.exportAsBriefingZip` — VS Code command handler.
 *
 * Surfaces on each Storyboard's overflow menu (per
 * `contracts/export-command.md`). The handler itself is a thin shim
 * over `exportBriefingZip` — every external touch is injected so the
 * core export logic stays integration-testable without a VS Code host.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import {
  exportBriefingZip,
  StoryboardNotFoundError,
  type ExportDeps,
  type StacItemMinimal,
} from '../services/briefingZipExport';
import type { StoryboardPlot } from '@debrief/components/storyboard';

export interface ExportStoryboardAsBriefingZipArgs {
  /** ULID of the StoryboardFeature to export. */
  storyboardId: string;
  /** URI of the active plot document. */
  documentUri: vscode.Uri;
}

export interface ExportHostDeps {
  /**
   * Load the plot's FeatureCollection + matching STAC item.json from the
   * VS Code workspace (typically via `vscode.workspace.fs`).
   */
  readPlot(uri: vscode.Uri): Promise<{
    fc: StoryboardPlot;
    item: StacItemMinimal;
    /** Directory used to resolve relative Scene-thumbnail hrefs. */
    itemDir: string;
  }>;
  fetchTile(url: string): Promise<Uint8Array>;
  /**
   * Resolve and read a Scene thumbnail by relative href against the
   * given item directory. Returns null when the file is absent.
   */
  readThumbnail(itemDir: string, href: string): Promise<Uint8Array | null>;
  /**
   * Read the bundled SPA static assets from
   * `apps/vscode/resources/briefing-renderer-static/**`. The orchestrator
   * passes the result to `assembleZip` verbatim (relative paths only).
   */
  readStaticBundle(): Promise<ReadonlyMap<string, Uint8Array>>;
  /** Write the assembled zip to disk. Wraps `vscode.workspace.fs.writeFile`. */
  writeFile(uri: vscode.Uri, data: Uint8Array): Promise<void>;
  /** UI shims (replaceable in tests). */
  showSaveDialog: (
    options: vscode.SaveDialogOptions,
  ) => Thenable<vscode.Uri | undefined>;
  showInfo: (msg: string, ...actions: string[]) => Thenable<string | undefined>;
  showError: (msg: string) => void;
  logWarning: (msg: string) => void;
  /** Optional progress UI; defaults to `vscode.window.withProgress`. */
  withProgress?: <T>(
    title: string,
    task: (
      progress: { report(value: { message?: string; increment?: number }): void },
    ) => Thenable<T>,
  ) => Thenable<T>;
}

const README_TEXT = `Debrief Briefing — air-gapped Storyboard

To play this briefing:
  1. Unzip into any folder.
  2. Open the resulting "index.html" by double-clicking it (or right-click → Open With → Chrome / Edge).

This briefing is built for current Chrome or Edge on desktop. Other browsers
may render the map but interactive playback is not supported.

No installation, no server, and no internet connection are needed — every
asset (the renderer, the GeoJSON payload, the basemap tiles, and the Scene
thumbnails) lives inside this zip.

Controls:
  - In Minimal mode (default) the transport bar offers play / pause / prev /
    next Scene and a time slider.
  - Press "P" to enter Present mode — all chrome hides and the map fills the
    screen. Press "P" again (or move the mouse to the top-right corner) to
    return to Minimal mode.
  - When the Storyboard reaches its final Scene the transport bar exposes a
    Replay button.

The briefing is read-only.
`;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'briefing';
}

function defaultDestinationUri(documentUri: vscode.Uri, storyboardName: string): vscode.Uri {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+$/, '')
    .replace('T', '-');
  const fileName = `briefing-${slugify(storyboardName)}-${stamp}.zip`;
  const parent = vscode.Uri.joinPath(documentUri, '..');
  return vscode.Uri.joinPath(parent, fileName);
}

export async function exportStoryboardAsBriefingZip(
  args: ExportStoryboardAsBriefingZipArgs,
  deps: ExportHostDeps,
): Promise<void> {
  let plot: StoryboardPlot;
  let item: StacItemMinimal;
  let itemDir: string;

  // Step 1: load plot + item.json.
  try {
    const loaded = await deps.readPlot(args.documentUri);
    plot = loaded.fc;
    item = loaded.item;
    itemDir = loaded.itemDir;
  } catch (e) {
    deps.showError(`Failed to read plot: ${(e as Error).message}`);
    return;
  }

  // Step 2-3 happen inside the orchestrator (scopeStoryboard), but we
  // want a clean error path for the missing-id case before prompting
  // for a destination.
  const storyboards = (plot.features as Array<{ properties: { kind?: string; id?: string; name?: string } }>).filter(
    (f) => f.properties.kind === 'STORYBOARD',
  );
  const chosen = storyboards.find((sb) => sb.properties.id === args.storyboardId);
  if (!chosen) {
    deps.showError(`Storyboard not found in the active plot (id: ${args.storyboardId}).`);
    return;
  }
  const storyboardName = chosen.properties.name ?? 'Briefing';

  // Step 4: prompt for destination.
  const destination = await deps.showSaveDialog({
    defaultUri: defaultDestinationUri(args.documentUri, storyboardName),
    filters: { 'Briefing zip': ['zip'] },
    title: 'Export Storyboard as briefing zip',
    saveLabel: 'Export',
  });
  if (!destination) {
    return; // user cancelled — no-op, no error (FR-003).
  }

  // Steps 5-9: build the zip in memory through the orchestrator.
  type ProgressApi = { report(value: { message?: string; increment?: number }): void };
  type ExportResult = Awaited<ReturnType<typeof exportBriefingZip>>;

  const runExport = async (progress: ProgressApi): Promise<ExportResult> => {
    const exportDeps: ExportDeps = {
      readStaticBundle: () => deps.readStaticBundle(),
      readThumbnail: (href) => deps.readThumbnail(itemDir, href),
      fetchTile: (url) => deps.fetchTile(url),
      onTileProgress: (fetched, total) => {
        progress.report({
          message: `Fetching basemap tile ${fetched} of ${total}…`,
          increment: total > 0 ? (1 / total) * 100 : undefined,
        });
      },
      logWarning: deps.logWarning,
    };
    return exportBriefingZip(
      { storyboardId: args.storyboardId, plot, item, readme: README_TEXT },
      exportDeps,
    );
  };

  try {
    const result: ExportResult = deps.withProgress
      ? await deps.withProgress('Exporting Storyboard as briefing zip…', runExport)
      : await vscode.window.withProgress<ExportResult>(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Exporting Storyboard as briefing zip…',
            cancellable: false,
          },
          (progress) => runExport(progress),
        );

    // Step 10: atomic write.
    await deps.writeFile(destination, result.bytes);

    // Step 11: success notification with Reveal action.
    const revealLabel = process.platform === 'darwin' ? 'Reveal in Finder' : 'Reveal in Explorer';
    const summary =
      `Briefing zip written — ${result.scenes.length} Scene(s), ` +
      `${result.tileCount} tile(s), ${result.thumbnailCount} thumbnail(s)` +
      (result.tileFetchErrors > 0 ? `, ${result.tileFetchErrors} tile fetch error(s)` : '');
    const action = await deps.showInfo(summary, revealLabel);
    if (action === revealLabel) {
      void vscode.commands.executeCommand('revealFileInOS', destination);
    }
  } catch (e) {
    if (e instanceof StoryboardNotFoundError) {
      deps.showError(`Storyboard not found: ${e.storyboardId}`);
      return;
    }
    deps.showError(`Briefing-zip export failed: ${(e as Error).message}`);
  }
}

/**
 * Build a default `ExportHostDeps` wired against the live VS Code APIs.
 * Used by `extension.ts` at command-registration time.
 */
export function createDefaultExportHostDeps(
  context: vscode.ExtensionContext,
  readPlot: ExportHostDeps['readPlot'],
): ExportHostDeps {
  const staticBundleRoot = vscode.Uri.joinPath(
    context.extensionUri,
    'resources',
    'briefing-renderer-static',
  );

  return {
    readPlot,
    fetchTile: async (url: string): Promise<Uint8Array> => {
      // Use the global `fetch` available in Node 18+ (VS Code runs Node 20).
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Debrief-Briefing-Export/0.1' },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching ${url}`);
      }
      const buf = await response.arrayBuffer();
      return new Uint8Array(buf);
    },
    readThumbnail: async (itemDir: string, href: string): Promise<Uint8Array | null> => {
      try {
        const resolved = path.isAbsolute(href) ? href : path.join(itemDir, href);
        const uri = vscode.Uri.file(resolved);
        const bytes = await vscode.workspace.fs.readFile(uri);
        return bytes;
      } catch {
        return null;
      }
    },
    readStaticBundle: async (): Promise<ReadonlyMap<string, Uint8Array>> => {
      const out = new Map<string, Uint8Array>();
      async function walk(dir: vscode.Uri, rel: string): Promise<void> {
        const entries = await vscode.workspace.fs.readDirectory(dir);
        for (const [name, type] of entries) {
          // Skip the .gitkeep placeholder.
          if (name === '.gitkeep') {continue;}
          const childRel = rel ? `${rel}/${name}` : name;
          const childUri = vscode.Uri.joinPath(dir, name);
          if (type === vscode.FileType.File) {
            const bytes = await vscode.workspace.fs.readFile(childUri);
            out.set(childRel, bytes);
          } else if (type === vscode.FileType.Directory) {
            await walk(childUri, childRel);
          }
        }
      }
      try {
        await walk(staticBundleRoot, '');
      } catch (e) {
        throw new Error(
          `Briefing renderer static bundle not found at ${staticBundleRoot.fsPath}. ` +
            `Run \`pnpm --filter @debrief/briefing-renderer build\` and the resource-sync step. ` +
            `Underlying error: ${(e as Error).message}`,
        );
      }
      return out;
    },
    writeFile: async (uri, bytes) => vscode.workspace.fs.writeFile(uri, bytes),
    showSaveDialog: (options) => vscode.window.showSaveDialog(options),
    showInfo: (msg, ...actions) => vscode.window.showInformationMessage(msg, ...actions),
    showError: (msg) => void vscode.window.showErrorMessage(msg),
    logWarning: (msg) => console.warn(`[briefing-zip] ${msg}`),
  };
}

import * as vscode from 'vscode';
import { StacTreeProvider } from './providers/stacTreeProvider';
import { StacFileSystemProvider } from './providers/stacFileSystemProvider';
import { ToolsTreeProvider } from './providers/toolsTreeProvider';
import { LayersTreeProvider } from './providers/layersTreeProvider';
import { OutlineProvider } from './providers/outlineProvider';
import { TimeRangeViewProvider } from './views/timeRangeView';
import { MapPanel } from './webview/mapPanel';
import { StacService } from './services/stacService';
import { ConfigService } from './services/configService';
import { CalcService } from './services/calcService';
import { RecentPlotsService } from './services/recentPlotsService';
import { registerCommands } from './commands';

let mapPanel: MapPanel | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Debrief extension activating...');

  // Initialize services
  const configService = new ConfigService();
  const stacService = new StacService();
  const calcService = new CalcService(context);
  const recentPlotsService = new RecentPlotsService(context);

  // Register file system provider for stac:// URIs
  const stacFileSystemProvider = new StacFileSystemProvider(stacService);
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider('stac', stacFileSystemProvider, {
      isCaseSensitive: true,
      isReadonly: true,
    })
  );

  // Register tree providers
  const stacTreeProvider = new StacTreeProvider(configService, stacService);
  const toolsTreeProvider = new ToolsTreeProvider(calcService);
  const layersTreeProvider = new LayersTreeProvider();
  const outlineProvider = new OutlineProvider();
  const timeRangeViewProvider = new TimeRangeViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('debrief.stacExplorer', stacTreeProvider),
    vscode.window.registerTreeDataProvider('debrief.tools', toolsTreeProvider),
    vscode.window.registerTreeDataProvider('debrief.layers', layersTreeProvider),
    vscode.window.registerWebviewViewProvider('debrief.timeRange', timeRangeViewProvider)
  );

  // Register outline provider for selection
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      { scheme: 'stac' },
      outlineProvider
    )
  );

  // Register commands
  const commands = registerCommands(
    context,
    configService,
    stacService,
    calcService,
    recentPlotsService,
    stacTreeProvider,
    toolsTreeProvider,
    layersTreeProvider,
    () => mapPanel,
    (panel) => {
      mapPanel = panel;
    }
  );
  context.subscriptions.push(...commands);

  // Set initial context
  await vscode.commands.executeCommand('setContext', 'debrief.plotOpen', false);
  await vscode.commands.executeCommand('setContext', 'debrief.mapFocused', false);
  await vscode.commands.executeCommand('setContext', 'debrief.hasSelection', false);
  await vscode.commands.executeCommand('setContext', 'debrief.hasResultLayers', false);
  await vscode.commands.executeCommand('setContext', 'debrief.calcAvailable', false);

  // Check debrief-calc availability (non-blocking)
  calcService.checkAvailability().then((available) => {
    void vscode.commands.executeCommand('setContext', 'debrief.calcAvailable', available);
  }).catch(() => {
    // Graceful degradation - tools won't be available but extension works
  });

  console.log('Debrief extension activated');
}

export function deactivate(): void {
  console.log('Debrief extension deactivated');
}

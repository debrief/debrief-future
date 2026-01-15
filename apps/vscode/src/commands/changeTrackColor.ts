/**
 * Change Track Color Command - Allow users to customize track colors
 */

import * as vscode from 'vscode';
import type { StacService } from '../services/stacService';
import type { ConfigService } from '../services/configService';
import type { MapPanel } from '../webview/mapPanel';

interface ChangeColorArgs {
  trackId: string;
}

/**
 * Create the change track color command
 */
export function createChangeTrackColorCommand(
  _stacService: StacService,
  _configService: ConfigService,
  getMapPanel: () => MapPanel | undefined
): (args: ChangeColorArgs) => Promise<void> {
  return async (args: ChangeColorArgs) => {
    if (!args?.trackId) {
      return;
    }

    const panel = getMapPanel();
    if (!panel) {
      return;
    }

    const tracks = panel.getTracks();
    const track = tracks.find((t) => t.id === args.trackId);

    if (!track) {
      return;
    }

    // Get default colors from configuration
    const config = vscode.workspace.getConfiguration('debrief');
    const defaultColors = config.get<string[]>('tracks.defaultColors') ?? [
      '#e41a1c',
      '#377eb8',
      '#4daf4a',
      '#984ea3',
      '#ff7f00',
    ];

    // Create quick pick items for color selection
    interface ColorPickItem extends vscode.QuickPickItem {
      color: string;
    }

    const colorItems: ColorPickItem[] = defaultColors.map((color, index) => ({
      label: `$(circle-filled) Color ${index + 1}`,
      description: color,
      color,
    }));

    // Add custom color option
    colorItems.push({
      label: '$(edit) Custom Color...',
      description: 'Enter a hex color code',
      color: '',
    });

    // Show quick pick
    const selection = await vscode.window.showQuickPick(colorItems, {
      placeHolder: `Select color for ${track.name}`,
    });

    if (!selection) {
      return;
    }

    let newColor = selection.color;

    if (!newColor) {
      // Custom color - show input box
      const input = await vscode.window.showInputBox({
        prompt: 'Enter hex color code',
        placeHolder: '#FF0000',
        value: track.color ?? '#377eb8',
        validateInput: (value) => {
          if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
            return 'Enter a valid hex color (e.g., #FF0000)';
          }
          return null;
        },
      });

      if (!input) {
        return;
      }

      newColor = input;
    }

    // Apply the color
    panel.setTrackColor(args.trackId, newColor);
  };
}

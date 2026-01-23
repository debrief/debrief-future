import * as vscode from 'vscode';
import { ActivityBarService } from '../services/activityBarService';

/**
 * Command handler to restore all hidden activity bar items.
 * This resets the activity bar to VS Code's default visibility.
 */
export function createRestoreActivitiesCommand(
  activityBarService: ActivityBarService
): vscode.Disposable {
  return vscode.commands.registerCommand('debrief.restoreActivities', async () => {
    await activityBarService.restoreDefaults();
    void vscode.window.showInformationMessage(
      'Activity bar restored to defaults. All activities are now visible.'
    );
  });
}

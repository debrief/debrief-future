import * as vscode from 'vscode';

/**
 * Service to inform users about the focused activity bar configuration.
 *
 * Activity visibility is configured via workspace settings (.vscode/settings.json).
 * This service shows a one-time prompt explaining the focused environment.
 */
export class ActivityBarService {
  private static readonly STATE_KEY = 'hideActivities.prompted';
  private static readonly DISMISSED_KEY = 'hideActivities.dismissed';

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Check if the prompt feature is enabled.
   */
  isEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('debrief');
    return config.get<boolean>('hideActivities.enabled', true);
  }

  /**
   * Show a prompt on first activation offering to help configure the activity bar.
   */
  async applyDefaults(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const hasPrompted = this.context.globalState.get<boolean>(
      ActivityBarService.STATE_KEY,
      false
    );

    const wasDismissed = this.context.globalState.get<boolean>(
      ActivityBarService.DISMISSED_KEY,
      false
    );

    if (hasPrompted || wasDismissed) {
      return;
    }

    await this.context.globalState.update(ActivityBarService.STATE_KEY, true);
    await this.showConfigurationPrompt();
  }

  /**
   * Show a prompt with options to configure activity bar visibility.
   */
  private async showConfigurationPrompt(): Promise<void> {
    const result = await vscode.window.showInformationMessage(
      'Debrief: Activity bar configured for focused analysis. Right-click the activity bar to restore hidden items (Search, Source Control, etc.).',
      'Learn More',
      'Got It'
    );

    if (result === 'Learn More') {
      // Open VS Code docs on activity bar customization
      await vscode.env.openExternal(
        vscode.Uri.parse('https://code.visualstudio.com/docs/getstarted/userinterface#_activity-bar')
      );
    } else if (result === 'Got It') {
      await this.context.globalState.update(ActivityBarService.DISMISSED_KEY, true);
    }
  }

  /**
   * Show instructions for restoring hidden activity bar items.
   */
  async restoreDefaults(): Promise<void> {
    const result = await vscode.window.showInformationMessage(
      'To restore hidden activities: Right-click the activity bar and check the items you want to show.',
      'Learn More'
    );

    if (result === 'Learn More') {
      await vscode.env.openExternal(
        vscode.Uri.parse('https://code.visualstudio.com/docs/getstarted/userinterface#_activity-bar')
      );
    }
  }
}

// Export for tests - simplified interface
export interface PinnedViewlet {
  id: string;
  pinned: boolean;
  visible: boolean;
  order: number;
}

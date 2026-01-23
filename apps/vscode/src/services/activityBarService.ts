import * as vscode from 'vscode';

/**
 * Structure of a pinned viewlet in VS Code's internal settings.
 */
export interface PinnedViewlet {
  id: string;
  pinned: boolean;
  visible: boolean;
  order: number;
}

/**
 * Service to manage activity bar visibility.
 * Hides non-essential activities (Search, Source Control, Debug, Extensions, Testing)
 * while preserving Explorer and Debrief.
 */
export class ActivityBarService {
  private static readonly PROTECTED_VIEW_IDS = [
    'workbench.view.explorer',
    'workbench.views.service.debrief',
  ];

  private static readonly STATE_KEY = 'hideActivities.initialized';
  private static readonly SNAPSHOT_KEY = 'hideActivities.lastSnapshot';

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Check if the hide activities feature is enabled.
   */
  isEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('debrief');
    return config.get<boolean>('hideActivities.enabled', true);
  }

  /**
   * Get the list of view IDs to hide.
   */
  getTargetViewIds(): string[] {
    const config = vscode.workspace.getConfiguration('debrief');
    return config.get<string[]>('hideActivities.viewIds', [
      'workbench.view.search',
      'workbench.view.scm',
      'workbench.view.debug',
      'workbench.view.extensions',
      'workbench.view.testing',
    ]);
  }

  /**
   * Apply default hiding behavior on first activation.
   */
  async applyDefaults(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const hasRunBefore = this.context.globalState.get<boolean>(
      ActivityBarService.STATE_KEY,
      false
    );

    if (hasRunBefore) {
      // Don't re-hide on subsequent activations; respect user overrides
      return;
    }

    await this.hideTargetActivities();
    await this.context.globalState.update(ActivityBarService.STATE_KEY, true);
  }

  /**
   * Hide the target activities by modifying VS Code settings.
   */
  private async hideTargetActivities(): Promise<void> {
    const targetIds = this.getTargetViewIds();
    const safeTargetIds = this.filterProtectedViews(targetIds);

    const config = vscode.workspace.getConfiguration('workbench');
    const pinnedViewlets = config.get<PinnedViewlet[] | Record<string, unknown>>(
      'activity.pinnedViewlets2'
    );

    if (!pinnedViewlets || !Array.isArray(pinnedViewlets)) {
      // Setting doesn't exist or is in unexpected format; skip
      return;
    }

    const modifiedViewlets = pinnedViewlets.map((viewlet) => {
      if (safeTargetIds.includes(viewlet.id)) {
        return { ...viewlet, visible: false };
      }
      return viewlet;
    });

    // Store snapshot before modifying
    await this.context.globalState.update(
      ActivityBarService.SNAPSHOT_KEY,
      JSON.stringify(modifiedViewlets)
    );

    await config.update(
      'activity.pinnedViewlets2',
      modifiedViewlets,
      vscode.ConfigurationTarget.Global
    );
  }

  /**
   * Remove protected view IDs from the target list.
   */
  private filterProtectedViews(viewIds: string[]): string[] {
    return viewIds.filter(
      (id) => !ActivityBarService.PROTECTED_VIEW_IDS.some((protected_id) =>
        id === protected_id || id.includes('debrief')
      )
    );
  }

  /**
   * Detect if user has manually re-enabled any hidden activities.
   */
  detectUserOverrides(): string[] {
    const snapshotJson = this.context.globalState.get<string>(
      ActivityBarService.SNAPSHOT_KEY
    );

    if (!snapshotJson) {
      return [];
    }

    const snapshot = JSON.parse(snapshotJson) as PinnedViewlet[];
    const config = vscode.workspace.getConfiguration('workbench');
    const current = config.get<PinnedViewlet[]>('activity.pinnedViewlets2', []);

    const targetIds = this.getTargetViewIds();
    const overrides: string[] = [];

    for (const id of targetIds) {
      const snapshotItem = snapshot.find((v) => v.id === id);
      const currentItem = current.find((v) => v.id === id);

      // If it was hidden in snapshot but is now visible, user re-enabled it
      if (snapshotItem?.visible === false && currentItem?.visible === true) {
        overrides.push(id);
      }
    }

    return overrides;
  }

  /**
   * Restore all default VS Code activities.
   */
  async restoreDefaults(): Promise<void> {
    const config = vscode.workspace.getConfiguration('workbench');
    const pinnedViewlets = config.get<PinnedViewlet[]>(
      'activity.pinnedViewlets2',
      []
    );

    const restoredViewlets = pinnedViewlets.map((viewlet) => ({
      ...viewlet,
      visible: true,
    }));

    await config.update(
      'activity.pinnedViewlets2',
      restoredViewlets,
      vscode.ConfigurationTarget.Global
    );

    // Clear initialization state so feature can re-apply if re-enabled
    await this.context.globalState.update(ActivityBarService.STATE_KEY, false);
    await this.context.globalState.update(ActivityBarService.SNAPSHOT_KEY, undefined);
  }
}

/**
 * Storyboard edit harness page (Feature 230 US4 — refactored by Feature 234
 * Phase 3 / ADR-027 to use the shared `useStoryOnlyMockHandlers` helper).
 *
 * Drop-in browser surface that mounts `<StoryboardPanel>` against the
 * shared callback-adapter helper. Initial state is driven by URL search
 * params so Playwright can set up deterministic scenarios without a VS
 * Code host.
 *
 * Supported query-string knobs (parsed in storyboard-edit-harness-querystring.ts):
 *   ?stale=sceneA,sceneC               — mark those Scenes stale on mount
 *   ?pendingDelete=sceneB              — mark that Scene pending-delete
 *   ?missingData=sceneC:f1,f2          — attach a missing-data descriptor
 *   ?induceCopyFailure=<sceneId>       — Feature 234 FR-043: route copy → failure
 *   ?induceRefreshFailure=<sceneId>    — Feature 234 FR-043: route refresh → failure
 *
 * Outbound recording: every reducer-bound handler also writes a record
 * to `window.__harnessOutbound__` so Playwright can assert against the
 * outbound stream the VS Code extension would have received. The
 * recorder is supplied to the helper as a callback — the helper itself
 * does not touch globals.
 */

import React from 'react';
import {
  StoryboardPanel,
  ThemeProvider,
  useStoryOnlyMockHandlers,
  composeSceneEditViewModels,
} from '@debrief/components';
import type { Theme } from '@debrief/components';
import {
  DEFAULT_STORYBOARD_EDIT_FIXTURE,
  type StoryboardEditFixture,
} from './storyboard-edit-fixtures';
import {
  parseHarnessQueryString,
  EMPTY_HARNESS_INITIAL as EMPTY_INITIAL,
  type StoryboardEditHarnessInitialState,
} from './storyboard-edit-harness-querystring';
export { parseHarnessQueryString };
export type { StoryboardEditHarnessInitialState };

interface OutboundRecord {
  readonly type: string;
  readonly payload: Record<string, unknown>;
  readonly timestamp: number;
}

// Make the outbound message capture available on window for Playwright.
declare global {
  // eslint-disable-next-line no-var
  var __harnessOutbound__: OutboundRecord[] | undefined;
}

function recordOutbound(
  type: string,
  payload: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;
  if (!globalThis.__harnessOutbound__) {
    globalThis.__harnessOutbound__ = [];
  }
  globalThis.__harnessOutbound__.push({
    type,
    payload,
    timestamp: Date.now(),
  });
}

export interface StoryboardEditHarnessProps {
  readonly fixture?: StoryboardEditFixture;
  readonly initial?: StoryboardEditHarnessInitialState;
}

export function StoryboardEditHarness({
  fixture = DEFAULT_STORYBOARD_EDIT_FIXTURE,
  initial = EMPTY_INITIAL,
}: StoryboardEditHarnessProps): React.ReactElement {
  const { state, handlers } = useStoryOnlyMockHandlers(fixture, {
    knobs: {
      induceCopyFailure: initial.induceCopyFailure,
      induceRefreshFailure: initial.induceRefreshFailure,
    },
    initial: {
      staleSceneIds: initial.staleSceneIds,
      pendingDeleteSceneIds: initial.pendingDeleteSceneIds,
      missingDataBySceneId: initial.missingDataBySceneId,
    },
    recordOutbound,
  });

  const themeConfig: Theme = { variant: state.theme };
  const sceneEditViewModels = composeSceneEditViewModels(state);

  return (
    <ThemeProvider theme={themeConfig}>
      <div
        data-testid="storyboard-edit-harness"
        style={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--vscode-sideBar-background, #1e1e1e)',
          color: 'var(--vscode-foreground, #cccccc)',
        }}
      >
        <div style={{ width: 420, maxWidth: '100%', height: '100%' }}>
          <StoryboardPanel
            scenes={state.sceneRows}
            activeStoryboardName={state.activeStoryboardName}
            captureInFlight={state.captureInFlight}
            storyboards={
              state.storyboards.length > 0 ? state.storyboards : undefined
            }
            activeStoryboardId={state.activeStoryboardId}
            currentSceneId={state.currentSceneId}
            transport={state.transport}
            onActiveStoryboardChange={(storyboardId): void =>
              recordOutbound('active-storyboard-changed', { storyboardId })
            }
            onCreateStoryboard={(): void =>
              recordOutbound('create-storyboard-requested', {})
            }
            onRenameStoryboard={(): void =>
              recordOutbound('rename-storyboard-requested', {})
            }
            onDeleteStoryboard={(): void =>
              recordOutbound('delete-storyboard-requested', {})
            }
            sceneEditViewModels={sceneEditViewModels}
            storyboardEditViewModel={state.storyboardEditViewModel ?? undefined}
            pendingUndoToast={state.pendingUndoToast}
            overflowMenuOpenFor={state.overflowMenuOpenFor}
            overflowMenuAnchorRect={state.overflowMenuAnchorRect}
            {...handlers}
          />
        </div>
      </div>
    </ThemeProvider>
  );
}

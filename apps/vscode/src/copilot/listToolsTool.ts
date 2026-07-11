/**
 * `debrief_listTools` — read tool exposing the live debrief-calc registry
 * to Copilot (#284, FR-002). Projects each tool to `ToolRegistryView`
 * (including the derived `mutating` flag) and reports the degraded state when
 * the registry is unavailable rather than returning a stale/hallucinated list
 * (edge case). No confirmation (read-only).
 */

import type * as vscode from 'vscode';
import type { CopilotToolDeps } from './deps';
import { jsonResult } from './resultHelpers';
import { toToolRegistryView } from './registry';
import type { TelemetryWriter } from './telemetry';
import type { RunContextProvider } from './runContext';
import { validateListToolsInput } from './validate';
import type { ToolsUnavailableResult } from './types';

export class ListToolsTool implements vscode.LanguageModelTool<unknown> {
  constructor(
    private readonly deps: CopilotToolDeps,
    private readonly telemetry: TelemetryWriter,
    private readonly runContext: RunContextProvider,
  ) {}

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<unknown>,
  ): Promise<vscode.LanguageModelToolResult> {
    const start = Date.now();
    const ctx = this.runContext();
    const input = validateListToolsInput(options.input);

    try {
      const tools = await this.deps.calcService.listTools();
      const view = tools.map(toToolRegistryView);
      const registryMs = Date.now() - start;

      this.telemetry.record({
        tool: 'listTools',
        input,
        validation: 'accepted',
        retries: 0,
        confirmation: 'not_required',
        latencyMs: { registry: registryMs, total: registryMs },
        activeModel: ctx.activeModel,
        primingEnabled: ctx.primingEnabled,
        outcome: 'ok',
      });

      return jsonResult(view);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const total = Date.now() - start;
      this.telemetry.record({
        tool: 'listTools',
        input,
        validation: 'accepted',
        retries: 0,
        confirmation: 'not_required',
        latencyMs: { total },
        activeModel: ctx.activeModel,
        primingEnabled: ctx.primingEnabled,
        outcome: { error: reason },
      });

      const degraded: ToolsUnavailableResult = {
        toolsUnavailable: true,
        reason: `The Debrief tool registry is unavailable (${reason}). The Python tool-server may be broken — no tools can be listed or run until it recovers.`,
      };
      return jsonResult(degraded);
    }
  }
}

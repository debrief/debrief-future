/**
 * `debrief_runTool` — the mutate/analyse meta-tool (#284, FR-002/FR-011..018).
 *
 * `prepareInvocation` gates mutating tools behind a plain-language confirmation
 * (FR-015); read/analytical tools auto-run. `invoke` validates the tool id and
 * parameters against the live registry (FR-017, no Python spawn on failure),
 * resolves the operating features by scope (FR-010), reuses the shared
 * `calcService.executeTool` path (FR-013), then routes the result: a mutation
 * lands as a dirty, disk-write-free editor edit (FR-011); an analytical result
 * populates the Results panel (FR-014); a failure surfaces structured error
 * text with the plot unchanged (FR-018). Provenance records the chat initiator
 * and the analyst's utterance (FR-023); every invocation is logged (FR-024).
 */

import * as vscode from 'vscode';
import type { DebriefFeature } from '@debrief/schemas';
import type { ToolExecutionResult } from '../types/tool';
import type { CopilotToolDeps } from './deps';
import { textResult } from './resultHelpers';
import { applyChatEdit } from './applyChatEdit';
import { featureDisplayName } from './summarize';
import { deriveMutating, findTool, validateParams } from './registry';
import {
  resolvePlotContext,
  resolveSelection,
  type ResolvedPlot,
} from './plotContext';
import type { SelectionContext } from './plotContext';
import type { TelemetryWriter } from './telemetry';
import type { RunContextProvider } from './runContext';
import { validateRunToolInput, InputValidationError } from './validate';
import type { RunToolInput, TelemetryConfirmation } from './types';

/** Human-readable resolution error → a chat-relayable message. */
function resolutionMessage(
  kind: 'noPlotOpen' | 'unknownPlotId' | 'unfocusedPlot',
  requestedPlotId?: string,
): string {
  switch (kind) {
    case 'noPlotOpen':
      return 'No plot is open, so there is nothing to run a tool against. Search the catalog and open a plot first.';
    case 'unknownPlotId':
      return `No open plot matches "${requestedPlotId ?? ''}". Ask to summarise the current plot to see the open plots.`;
    case 'unfocusedPlot':
      return `The plot "${requestedPlotId ?? ''}" is open but not focused. Open it before running a tool against it.`;
  }
}

/** The resolved operating set, or a structured reason it could not be resolved. */
type TargetResolution =
  | { kind: 'ok'; scope: 'features' | 'selection' | 'all'; featureIds: string[] }
  | { kind: 'error'; message: string };

/** Match features whose display name equals (then contains) `name`, case-insensitively. */
function matchByName(
  features: DebriefFeature[],
  name: string,
): DebriefFeature[] {
  const n = name.trim().toLowerCase();
  if (n === '') {
    return [];
  }
  const exact = features.filter(
    (f) => featureDisplayName(f).toLowerCase() === n,
  );
  if (exact.length > 0) {
    return exact;
  }
  return features.filter((f) => featureDisplayName(f).toLowerCase().includes(n));
}

/**
 * Resolve the operating feature set (FR-010 + named-feature targeting).
 *
 * Precedence: explicit `featureIds`/`featureNames` (target by identity/name)
 * win over `scope`. Names resolve against each feature's display name; an
 * unknown or ambiguous name is reported, never guessed. Falls back to the
 * selection (default when one exists) or all features.
 */
function resolveTargets(
  input: RunToolInput,
  allFeatures: DebriefFeature[],
  selection: SelectionContext,
): TargetResolution {
  const explicitIds = input.featureIds ?? [];
  const names = input.featureNames ?? [];

  if (explicitIds.length > 0 || names.length > 0) {
    const knownIds = new Set(allFeatures.map((f) => String(f.id)));
    const resolved = new Set<string>();
    const problems: string[] = [];

    for (const id of explicitIds) {
      if (knownIds.has(id)) {
        resolved.add(id);
      } else {
        problems.push(`no feature with id "${id}"`);
      }
    }
    for (const name of names) {
      const matches = matchByName(allFeatures, name);
      if (matches.length === 0) {
        problems.push(`no feature named "${name}"`);
      } else if (matches.length > 1) {
        const listed = matches
          .map((m) => `${featureDisplayName(m)} (${String(m.id)})`)
          .join(', ');
        problems.push(`"${name}" is ambiguous — matches ${matches.length}: ${listed}`);
      } else {
        resolved.add(String(matches[0]?.id));
      }
    }

    if (problems.length > 0) {
      const available = allFeatures
        .map((f) => featureDisplayName(f))
        .join(', ');
      return {
        kind: 'error',
        message: `Could not resolve the target features: ${problems.join('; ')}. Features in this plot: ${available || '(none)'}. Select them, or pass exact names/ids from debrief_summarizeCurrentPlot.`,
      };
    }
    return { kind: 'ok', scope: 'features', featureIds: [...resolved] };
  }

  const scope = input.scope ?? (selection.ids.length > 0 ? 'selection' : 'all');
  if (scope === 'selection') {
    if (selection.ids.length === 0) {
      return {
        kind: 'error',
        message:
          'Nothing is selected. Select one or more features in the plot, name them explicitly (featureNames), or run on all features (scope:"all"). I will not guess.',
      };
    }
    return { kind: 'ok', scope, featureIds: selection.ids };
  }
  const allIds = allFeatures.map((f) => String(f.id));
  if (allIds.length === 0) {
    return {
      kind: 'error',
      message: 'The plot has no features to run the tool on.',
    };
  }
  return { kind: 'ok', scope: 'all', featureIds: allIds };
}

export class RunToolTool implements vscode.LanguageModelTool<unknown> {
  constructor(
    private readonly deps: CopilotToolDeps,
    private readonly telemetry: TelemetryWriter,
    private readonly runContext: RunContextProvider,
  ) {}

  // ── Confirmation gate (FR-015) ─────────────────────────────────────────────
  prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<unknown>,
  ): vscode.PreparedToolInvocation {
    let input: RunToolInput;
    try {
      input = validateRunToolInput(options.input);
    } catch {
      // Malformed input — let invoke return the corrective message; no gate.
      return { invocationMessage: 'Running Debrief tool…' };
    }

    const tools = this.deps.calcService.getCurrentTools();
    const tool = findTool(tools, input.toolId);
    if (!tool) {
      // Unknown tool — invoke rejects pre-dispatch (no execution), so no gate.
      return { invocationMessage: `Running ${input.toolId}…` };
    }

    const invocationMessage = `Running ${tool.name}…`;
    if (!deriveMutating(tool)) {
      return { invocationMessage };
    }

    const resolution = resolvePlotContext(this.deps, input.plotId);
    const plotTitle =
      resolution.kind === 'resolved' ? resolution.title : 'the current plot';
    const featureNames =
      resolution.kind === 'resolved'
        ? this.describeTargetFeatures(input, resolution)
        : 'the plot features';

    const paramLines = describeParams(input.params);
    const message = new vscode.MarkdownString();
    message.appendMarkdown(`**${tool.name}** will modify **${plotTitle}**.\n\n`);
    message.appendMarkdown(`- Target: ${featureNames}\n`);
    for (const line of paramLines) {
      message.appendMarkdown(`- ${line}\n`);
    }
    message.appendMarkdown(
      `\nThe change is applied to the open editor and left unsaved (undo/revert to discard).`,
    );

    return {
      invocationMessage,
      confirmationMessages: {
        title: `Run ${tool.name} on ${plotTitle}`,
        message,
      },
    };
  }

  /** Plain-language target-features description for the confirmation body. */
  private describeTargetFeatures(
    input: RunToolInput,
    resolution: ResolvedPlot,
  ): string {
    const allFeatures = resolution.panel.getFeatures();
    const selection = resolveSelection(this.deps, resolution.panel);
    const targets = resolveTargets(input, allFeatures, selection);
    if (targets.kind === 'error') {
      // Unresolved here — invoke re-checks and returns the corrective message.
      return 'the target features (to be confirmed on run)';
    }
    if (targets.scope === 'all') {
      return `all ${targets.featureIds.length} features in ${resolution.title}`;
    }
    const idToName = new Map(
      allFeatures.map((f) => [String(f.id), featureDisplayName(f)]),
    );
    return targets.featureIds.map((id) => idToName.get(id) ?? id).join(', ');
  }

  // ── Execution (FR-011..018) ────────────────────────────────────────────────
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<unknown>,
    token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const start = Date.now();
    const ctx = this.runContext();

    // 1. Validate input shape.
    let input: RunToolInput;
    try {
      input = validateRunToolInput(options.input);
    } catch (err) {
      const reason =
        err instanceof InputValidationError ? err.message : String(err);
      return this.reject('runTool', {}, reason, start, ctx, 'not_required');
    }

    // 2. Validate tool id + params against the live registry (FR-017).
    const tools = this.deps.calcService.getCurrentTools();
    const tool = findTool(tools, input.toolId);
    if (!tool) {
      const known = tools.map((t) => t.id).slice(0, 20).join(', ');
      const reason = `Unknown tool id "${input.toolId}". Call debrief_listTools first. Available: ${known || '(registry empty)'}`;
      return this.reject('runTool', input, reason, start, ctx, 'not_required');
    }
    const paramErrors = validateParams(tool, input.params);
    if (paramErrors.length > 0) {
      const reason = `Invalid parameters for "${tool.id}": ${paramErrors.join('; ')}`;
      return this.reject('runTool', input, reason, start, ctx, 'not_required');
    }

    const mutatingByCategory = deriveMutating(tool);
    const confirmation: TelemetryConfirmation = mutatingByCategory
      ? 'approved' // invoke only runs on a mutating tool after approval.
      : 'not_required';

    // 3. Resolve plot + operating features.
    const resolution = resolvePlotContext(this.deps, input.plotId);
    if (resolution.kind !== 'resolved') {
      const reason = resolutionMessage(
        resolution.kind,
        'requestedPlotId' in resolution
          ? resolution.requestedPlotId
          : undefined,
      );
      return this.reject('runTool', input, reason, start, ctx, confirmation);
    }

    const selection = resolveSelection(this.deps, resolution.panel);
    const targets = resolveTargets(
      input,
      resolution.panel.getFeatures(),
      selection,
    );
    if (targets.kind === 'error') {
      return this.reject('runTool', input, targets.message, start, ctx, confirmation);
    }
    const operatingFeatureIds = targets.featureIds;

    // 4. Execute via the shared Python path, cancellation-aware.
    const pyStart = Date.now();
    token.onCancellationRequested(() => this.deps.calcService.cancelExecution());
    let result: ToolExecutionResult;
    try {
      result = await this.deps.calcService.executeTool({
        toolId: input.toolId,
        featureIds: operatingFeatureIds,
        ...(input.params ? { params: input.params } : {}),
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.routeError(resolution, input, operatingFeatureIds, reason);
      return this.reject('runTool', input, reason, start, ctx, confirmation);
    }
    const pythonMs = Date.now() - pyStart;

    // 5. Failure → structured error, plot unchanged (FR-018).
    if (!result.success) {
      const reason = result.error ?? 'Unknown tool error';
      this.routeError(resolution, input, operatingFeatureIds, reason);
      return this.reject(
        'runTool',
        input,
        reason,
        start,
        ctx,
        confirmation,
        pythonMs,
      );
    }

    const resultIsMutation = result.resultType?.startsWith('mutation/') === true;

    // 5a. Guard (T025 / data-model): a mutating result from a tool the gate
    // classified as analytical never passed a confirmation — refuse it.
    if (resultIsMutation && !mutatingByCategory) {
      throw new Error(
        `Tool "${tool.id}" produced a mutating result (${result.resultType}) but was not gated by a confirmation. Refusing to apply an unconfirmed edit.`,
      );
    }

    // 6. Route the successful result.
    const applyStart = Date.now();
    let summary: string;
    if (resultIsMutation) {
      const outcome = applyChatEdit(
        {
          calcService: this.deps.calcService,
          sessionManager: this.deps.sessionManager,
        },
        resolution.panel,
        input.toolId,
        result,
        operatingFeatureIds,
      );
      summary = outcome.applied
        ? `Applied ${tool.name} to ${outcome.modifiedFeatureIds.length} feature(s) in "${resolution.title}". The plot is now dirty (unsaved) — undo/revert to discard, or Save to persist.`
        : `${tool.name} ran but produced no editable change.`;
    } else {
      this.routeAnalytical(resolution, input, result, operatingFeatureIds);
      summary = `Ran ${tool.name}. A summary is in this reply and the full result is in the Results panel.`;
    }
    const applyMs = Date.now() - applyStart;

    // 7. Provenance (FR-023) + 8. telemetry (FR-024).
    this.recordProvenance(resolution, input, result, operatingFeatureIds);
    this.telemetry.record({
      tool: 'runTool',
      input,
      validation: 'accepted',
      retries: 0,
      confirmation,
      latencyMs: {
        python: pythonMs,
        apply: applyMs,
        total: Date.now() - start,
      },
      activeModel: ctx.activeModel,
      primingEnabled: ctx.primingEnabled,
      outcome: 'ok',
    });

    return textResult(summary);
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  /** Emit a corrective/failure telemetry record and return the text result. */
  private reject(
    _tool: 'runTool',
    input: object,
    reason: string,
    start: number,
    ctx: { activeModel: string; primingEnabled: boolean },
    confirmation: TelemetryConfirmation,
    pythonMs?: number,
  ): vscode.LanguageModelToolResult {
    const rejected = reason.startsWith('Invalid') || reason.startsWith('Unknown');
    this.telemetry.record({
      tool: 'runTool',
      input,
      validation: rejected ? { rejected: reason } : 'accepted',
      retries: 0,
      confirmation,
      latencyMs: {
        ...(pythonMs !== undefined ? { python: pythonMs } : {}),
        total: Date.now() - start,
      },
      activeModel: ctx.activeModel,
      primingEnabled: ctx.primingEnabled,
      outcome: { error: reason },
    });
    return textResult(reason);
  }

  /** Route a failure to the Results panel error tab (FR-018). */
  private routeError(
    resolution: ResolvedPlot,
    input: RunToolInput,
    featureIds: string[],
    errorMessage: string,
  ): void {
    this.deps.resultsPanelService.addErrorTab({
      plotKey: resolution.plotKey,
      toolId: input.toolId,
      errorMessage,
      sourceFeatureIds: featureIds,
      parameters: input.params,
    });
  }

  /** Route an analytical result to the Results panel (FR-014). */
  private routeAnalytical(
    resolution: ResolvedPlot,
    input: RunToolInput,
    result: ToolExecutionResult,
    featureIds: string[],
  ): void {
    const allFeatures = resolution.panel.getFeatures();
    const sourceFeatureNames = featureIds.map((id) => {
      const feature = allFeatures.find((f) => String(f.id) === id);
      return feature ? featureDisplayName(feature) : id;
    });
    this.deps.resultsPanelService.addDatasetsForToolResult({
      plotKey: resolution.plotKey,
      toolId: input.toolId,
      result: { features: result.features },
      sourceFeatureIds: featureIds,
      sourceFeatureNames,
      parameters: input.params,
      parentActivityId: '',
    });
  }

  /** Record provenance with the chat initiator + utterance (FR-023 / R7). */
  private recordProvenance(
    resolution: ResolvedPlot,
    input: RunToolInput,
    result: ToolExecutionResult,
    featureIds: string[],
  ): void {
    const logService = resolution.panel.getLogService();
    if (!logService) {
      return;
    }
    // Ride the chat initiator + verbatim utterance in the provenance
    // parameters envelope (no LinkML schema change — R7).
    const parameters = {
      ...(result.parameters ?? {}),
      __chatInitiated: { value: true, default: false, tunable: false },
      __utterance: {
        value: input.utterance ?? '',
        default: false,
        tunable: false,
      },
    };
    void logService
      .recordToolResult(
        {
          success: true,
          features: result.features,
          duration_ms: result.durationMs,
          result_type: result.resultType,
          source_feature_ids: result.sourceFeatureIds ?? featureIds,
          artifact_href: result.artifactHref,
          tool_id: input.toolId,
        },
        {
          tool_version: result.tool_version,
          modified_features: result.modifiedFeatures,
          created_features: result.createdFeatures,
          created_assets: result.createdAssets,
          parameters,
        },
        resolution.plotKey.storePath,
        resolution.plotKey.itemPath,
      )
      .catch(() => {
        // Provenance is best-effort — never break the tool call.
      });
  }
}

/** Plain-language parameter lines for the confirmation body (never raw JSON). */
function describeParams(params: Record<string, unknown> | undefined): string[] {
  if (!params || Object.keys(params).length === 0) {
    return ['Parameters: (defaults)'];
  }
  return Object.entries(params).map(
    ([key, value]) => `${key}: ${formatParamValue(value)}`,
  );
}

/** Format a single parameter value for human reading. */
function formatParamValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '(none)';
  }
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join(', ');
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  // Nested object (rare) — compact key list keeps the gate readable.
  return `{${Object.keys(value).join(', ')}}`;
}

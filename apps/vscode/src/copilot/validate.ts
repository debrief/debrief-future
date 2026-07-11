/**
 * Boundary validators for LM tool inputs (#284, Article XV.5).
 *
 * Every value arriving from the model is `unknown`; these narrow it to the
 * typed input shapes before any tool logic runs. Invalid shapes raise
 * {@link InputValidationError}, which the tools convert to a corrective,
 * model-actionable result (FR-017/FR-018) rather than throwing to the host.
 */

import type {
  ListToolsInput,
  RunToolInput,
  SearchPlotsInput,
  SummarizeCurrentPlotInput,
} from './types';

/** Thrown when an LM tool input fails boundary validation. */
export class InputValidationError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new InputValidationError(`"${field}" must be a string`);
  }
  return value;
}

function optionalStringArray(
  value: unknown,
  field: string,
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    throw new InputValidationError(`"${field}" must be a string array`);
  }
  return value as string[];
}

function optionalBbox(
  value: unknown,
): [number, number, number, number] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (
    !Array.isArray(value) ||
    value.length !== 4 ||
    value.some((v) => typeof v !== 'number' || Number.isNaN(v))
  ) {
    throw new InputValidationError(
      '"bbox" must be [west, south, east, north] numbers',
    );
  }
  return value as [number, number, number, number];
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'boolean') {
    throw new InputValidationError(`"${field}" must be a boolean`);
  }
  return value;
}

/** Validate `debrief_searchPlots` input. */
export function validateSearchPlotsInput(raw: unknown): SearchPlotsInput {
  const input = isRecord(raw) ? raw : {};
  return {
    text: optionalString(input.text, 'text'),
    startTime: optionalString(input.startTime, 'startTime'),
    endTime: optionalString(input.endTime, 'endTime'),
    platforms: optionalStringArray(input.platforms, 'platforms'),
    bbox: optionalBbox(input.bbox),
    open: optionalBoolean(input.open, 'open'),
  };
}

/** Validate `debrief_summarizeCurrentPlot` input. */
export function validateSummarizeInput(
  raw: unknown,
): SummarizeCurrentPlotInput {
  const input = isRecord(raw) ? raw : {};
  return {
    plotId: optionalString(input.plotId, 'plotId'),
    selectionOnly: optionalBoolean(input.selectionOnly, 'selectionOnly'),
  };
}

/** Validate `debrief_listTools` input. */
export function validateListToolsInput(raw: unknown): ListToolsInput {
  const input = isRecord(raw) ? raw : {};
  return { plotId: optionalString(input.plotId, 'plotId') };
}

/** Validate `debrief_runTool` input (toolId is required). */
export function validateRunToolInput(raw: unknown): RunToolInput {
  const input = isRecord(raw) ? raw : {};
  const toolId = input.toolId;
  if (typeof toolId !== 'string' || toolId.trim() === '') {
    throw new InputValidationError('"toolId" is required and must be a string');
  }
  let params: Record<string, unknown> | undefined;
  if (input.params !== undefined) {
    if (!isRecord(input.params)) {
      throw new InputValidationError('"params" must be an object');
    }
    params = input.params;
  }
  const scope = input.scope;
  if (scope !== undefined && scope !== 'all' && scope !== 'selection') {
    throw new InputValidationError('"scope" must be "all" or "selection"');
  }
  return {
    toolId,
    ...(params ? { params } : {}),
    plotId: optionalString(input.plotId, 'plotId'),
    ...(scope ? { scope } : {}),
    utterance: optionalString(input.utterance, 'utterance'),
  };
}

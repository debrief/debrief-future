/**
 * Registry projection + parameter validation for the run/list tools (#284).
 *
 * `debrief_listTools` projects the live `calcService` registry to
 * `ToolRegistryView[]`; `debrief_runTool` validates a requested tool id and
 * its parameters against that registry before dispatch (FR-017).
 *
 * ## Mutating classification
 *
 * The registry entry does not carry a tool's `resultType` (that is only known
 * once a tool runs), so the *pre-execution* mutating flag — which drives the
 * confirmation gate (FR-015) — is derived from the tool's UI category:
 * `calc`/`snapshot` are analytical (auto-run); everything else, including an
 * absent category, is treated as mutating so an unknown tool is gated rather
 * than applied unconfirmed (defensive default). The authoritative check is the
 * invoke-time guard: a result whose `resultType` is `mutation/*` produced by a
 * tool the gate classified as analytical must be refused (data-model rule).
 */

import type { Tool } from '../types/tool';
import type { ToolRegistryView } from './types';

/** Categories whose tools do not modify the open plot. */
const ANALYTICAL_CATEGORIES = new Set(['calc', 'snapshot']);

/** Pre-execution mutating classification for the confirmation gate. */
export function deriveMutating(tool: Tool): boolean {
  const category = tool.category ?? '';
  return !ANALYTICAL_CATEGORIES.has(category);
}

/** Project a registry tool to the chat-facing view. */
export function toToolRegistryView(tool: Tool): ToolRegistryView {
  return {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    category: tool.category,
    requirements: tool.requirements,
    mutating: deriveMutating(tool),
  };
}

/** Find a tool by id in a registry snapshot. */
export function findTool(tools: Tool[], toolId: string): Tool | undefined {
  return tools.find((t) => t.id === toolId);
}

/**
 * Validate params against a tool's parameter schema (FR-017).
 *
 * Checks required presence, coarse value types, and enum choice membership —
 * enough to reject a hallucinated parameter set with a corrective message
 * before spawning Python, without duplicating the Python-side schema.
 *
 * @returns a list of human-readable errors (empty ⇒ valid).
 */
export function validateParams(
  tool: Tool,
  params: Record<string, unknown> | undefined,
): string[] {
  const errors: string[] = [];
  const supplied = params ?? {};
  const declared = tool.parameters ?? [];
  const declaredNames = new Set(declared.map((p) => p.name));

  // Unknown params (the model invented a parameter name).
  for (const key of Object.keys(supplied)) {
    if (!declaredNames.has(key)) {
      errors.push(`unknown parameter "${key}"`);
    }
  }

  for (const param of declared) {
    const value = supplied[param.name];
    const present = value !== undefined && value !== null;

    if (param.required === true && !present) {
      errors.push(`missing required parameter "${param.name}"`);
      continue;
    }
    if (!present) {
      continue;
    }

    switch (param.valueType) {
      case 'number':
        if (typeof value !== 'number' || Number.isNaN(value)) {
          errors.push(`parameter "${param.name}" must be a number`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`parameter "${param.name}" must be a boolean`);
        }
        break;
      case 'enum': {
        const choices = param.choices ?? [];
        if (typeof value !== 'string') {
          errors.push(`parameter "${param.name}" must be a string`);
        } else if (choices.length > 0 && !choices.includes(value)) {
          errors.push(
            `parameter "${param.name}" must be one of: ${choices.join(', ')}`,
          );
        }
        break;
      }
      case 'string':
      default:
        if (typeof value !== 'string') {
          errors.push(`parameter "${param.name}" must be a string`);
        }
        break;
    }
  }

  return errors;
}

/**
 * Schema-to-spec resolver — turns a single JSON Schema property entry (as
 * emitted by LinkML's gen-json-schema) into a `FieldSpec` the PropertiesForm
 * can render without further knowledge of the schema shape.
 *
 * This is the extensibility seam referenced by FR-003 / SC-003: adding a new
 * LinkML type only requires extending this resolver (and, if needed, adding a
 * new sibling widget). `PropertiesForm.tsx` itself stays schema-agnostic.
 */

import type { FieldSpec } from './types';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * LinkML emits optional scalars as `{"type": ["string", "null"]}`. Everywhere
 * we read the type we first normalise it to a single string (or `undefined`
 * when unparseable).
 */
function resolveType(typeField: unknown): string | undefined {
  if (typeof typeField === 'string') return typeField;
  if (Array.isArray(typeField)) {
    for (const entry of typeField) {
      if (typeof entry === 'string' && entry !== 'null') return entry;
    }
  }
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') return undefined;
    out.push(entry);
  }
  return out;
}

function isPlatformRecordRef(ref: unknown): boolean {
  return typeof ref === 'string' && /PlatformRecord$/.test(ref);
}

/**
 * Resolve a single JSON Schema property entry (from a parent object's
 * `properties` map) to the corresponding `FieldSpec`.
 *
 * Falls back to `{ kind: 'unsupported' }` when the shape is not recognised —
 * the form renders these as disabled, with the reason as a tooltip.
 */
export function resolveFieldSpec(jsonSchemaProperty: unknown, key: string): FieldSpec {
  if (!isRecord(jsonSchemaProperty)) {
    return {
      kind: 'unsupported',
      reason: `Field "${key}" has no JSON Schema definition.`,
    };
  }

  const type = resolveType(jsonSchemaProperty.type);

  // Arrays — check first, since the items branch branches further.
  if (type === 'array') {
    const items = jsonSchemaProperty.items;
    const minItems = asNumber(jsonSchemaProperty.minItems);
    const maxItems = asNumber(jsonSchemaProperty.maxItems);

    // bbox: [W, S, E, N] as 4 numeric items
    if (
      isRecord(items) &&
      resolveType(items.type) === 'number' &&
      minItems === 4 &&
      maxItems === 4
    ) {
      return { kind: 'bbox' };
    }

    if (isRecord(items)) {
      // platform-array: items.$ref → PlatformRecord
      if (isPlatformRecordRef(items.$ref)) {
        return { kind: 'platform-array' };
      }

      const itemType = resolveType(items.type);
      if (itemType === 'string') {
        const itemEnum = asStringArray(items.enum);
        return {
          kind: 'string-array',
          ...(itemEnum ? { itemEnum } : {}),
          ...(maxItems !== undefined ? { maxItems } : {}),
        };
      }
    }

    return {
      kind: 'unsupported',
      reason: `Field "${key}" is an array whose item shape is not supported.`,
    };
  }

  // Scalars
  if (type === 'string') {
    const format = asString(jsonSchemaProperty.format);
    const enumValues = asStringArray(jsonSchemaProperty.enum);
    const pattern = asString(jsonSchemaProperty.pattern);
    const maxLength = asNumber(jsonSchemaProperty.maxLength);

    if (format === 'date-time') return { kind: 'datetime' };
    if (enumValues) return { kind: 'enum', allowedValues: enumValues };

    // ISO-8601 duration pattern, e.g. "^PT...$" (usually for tunable durations)
    if (pattern && /^\^?PT/.test(pattern)) {
      return { kind: 'duration' };
    }

    return {
      kind: 'string',
      ...(maxLength !== undefined ? { maxLength } : {}),
      ...(pattern ? { pattern } : {}),
    };
  }

  if (type === 'integer' || type === 'number') {
    const min = asNumber(jsonSchemaProperty.minimum);
    const max = asNumber(jsonSchemaProperty.maximum);
    return {
      kind: 'number',
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
      ...(type === 'integer' ? { integer: true } : {}),
    };
  }

  if (type === 'boolean') {
    return { kind: 'boolean' };
  }

  return {
    kind: 'unsupported',
    reason: `Field "${key}" has unsupported JSON Schema type "${String(
      jsonSchemaProperty.type,
    )}".`,
  };
}

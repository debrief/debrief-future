/**
 * Parse and validate an LLM response into a GenerationResult (#188 T020/T021).
 *
 * Five-stage pipeline (decisions 8A, 10A):
 *   1. JSON parse                       → malformed-json
 *   2. Shape check                      → schema-violation
 *   3. cql2JsonToFilterExpression check → cql2-evaluation-failed
 *   4. PROPERTY_MAP field check         → hallucinated-field
 *   5. Unrecognised-term leak visitor   → unrecognised-term-leaked
 *
 * On success, returns `GenerationResult` with `error: null`. On any failure,
 * `error` is populated and the downstream fields are best-effort (cql2 may be
 * `{}` when we could not parse it).
 */

import { createHash } from "node:crypto";
import {
  Cql2ParseError,
  PROPERTY_MAP,
  cql2JsonToFilterExpression,
} from "../filter-engine";
import type { FilterType } from "../filter-engine";
import type {
  Cql2Json,
  GenerationError,
  GenerationErrorReason,
  GenerationResult,
  LozengeSeed,
} from "./types";

/** Set of valid FilterType strings — for runtime validation of lozenges. */
const VALID_FILTER_TYPES: ReadonlySet<string> = new Set(
  Object.keys(PROPERTY_MAP),
);

/** Set of valid CQL2 property paths, derived from PROPERTY_MAP. */
const VALID_TOP_LEVEL_PROPERTIES: ReadonlySet<string> = new Set(
  Object.values(PROPERTY_MAP),
);

/** Platform fields allowed as property refs inside an array_filter predicate. */
const VALID_PLATFORM_FIELDS: ReadonlySet<string> = new Set([
  "id",
  "name",
  "nationality",
  "vessel_class",
  "vessel_type",
  "vessel_role",
  "domain",
]);

/** The full expected LLM response shape before validation. */
interface LLMResponseShape {
  cql2: Cql2Json;
  lozenges: readonly LozengeSeed[];
  unrecognisedTerms: readonly string[];
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function buildError(
  reason: GenerationErrorReason,
  message: string,
  rawResponse: string,
): GenerationError {
  return { reason, message, rawResponse };
}

function failure(
  phrase: string,
  rawResponse: string,
  promptHash: string,
  promptVersion: string,
  reason: GenerationErrorReason,
  message: string,
  partial?: { cql2?: Cql2Json; lozenges?: readonly LozengeSeed[]; unrecognisedTerms?: readonly string[] },
): GenerationResult {
  return {
    phrase,
    cql2: partial?.cql2 ?? {},
    lozenges: partial?.lozenges ?? [],
    unrecognisedTerms: partial?.unrecognisedTerms ?? [],
    error: buildError(reason, message, rawResponse),
    diagnostics: {
      promptVersion,
      promptHash,
      responseHash: sha256(rawResponse),
      usedLlm: true,
    },
  };
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function asShape(value: unknown): LLMResponseShape | null {
  if (value === null || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.cql2 !== "object" || obj.cql2 === null || Array.isArray(obj.cql2)) {
    return null;
  }
  if (!Array.isArray(obj.lozenges)) return null;
  if (!isStringArray(obj.unrecognisedTerms)) return null;

  // Validate each lozenge's shape.
  const lozenges: LozengeSeed[] = [];
  for (const entry of obj.lozenges) {
    if (entry === null || typeof entry !== "object") return null;
    const e = entry as Record<string, unknown>;
    if (typeof e.filterType !== "string" || typeof e.value !== "string") return null;
    if (!VALID_FILTER_TYPES.has(e.filterType)) return null;
    const seed: LozengeSeed = {
      filterType: e.filterType as FilterType,
      value: e.value,
      ...(typeof e.negated === "boolean" ? { negated: e.negated } : {}),
    };
    lozenges.push(seed);
  }

  return {
    cql2: obj.cql2 as Cql2Json,
    lozenges,
    unrecognisedTerms: obj.unrecognisedTerms,
  };
}

// ---------------------------------------------------------------------------
// Unrecognised-term leak visitor (T021, FR-013)
// ---------------------------------------------------------------------------

interface Cql2Node {
  readonly op?: string;
  readonly args?: readonly unknown[];
}

function asCql2Node(value: unknown): Cql2Node | null {
  if (value !== null && typeof value === "object" && "op" in value) {
    return value as Cql2Node;
  }
  return null;
}

/**
 * Walk a CQL2-JSON tree and collect every string value that appears as a
 * predicate value (RHS of `=`, RHS pattern of `like`, first element of the
 * `a_containedBy` value array, and `=` values inside `array_filter`'s inner
 * predicate tree).
 *
 * Property names are deliberately excluded — only VALUES are checked against
 * the unrecognised-term list.
 */
export function collectCql2Values(cql2: Cql2Json): string[] {
  const values: string[] = [];
  walk(cql2 as Cql2Node);
  return values;

  function walk(node: Cql2Node | null): void {
    if (node === null) return;
    const op = node.op;
    const args = node.args ?? [];

    if (op === "=") {
      if (args.length === 2 && typeof args[1] === "string") {
        values.push(args[1]);
      }
      return;
    }

    if (op === "like") {
      if (args.length === 2 && typeof args[1] === "string") {
        // Strip wildcards for leak detection so "%atlantic%" checks against "atlantic".
        let v = args[1];
        if (v.startsWith("%")) v = v.slice(1);
        if (v.endsWith("%")) v = v.slice(0, -1);
        values.push(v);
      }
      return;
    }

    if (op === "a_containedBy") {
      const valueArray = args[0];
      if (Array.isArray(valueArray)) {
        for (const v of valueArray) {
          if (typeof v === "string") values.push(v);
        }
      }
      return;
    }

    if (op === "array_filter") {
      walk(asCql2Node(args[1]));
      return;
    }

    if (op === "not" || op === "and" || op === "or") {
      for (const child of args) {
        walk(asCql2Node(child));
      }
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// PROPERTY_MAP hallucination check
// ---------------------------------------------------------------------------

/** Collect every property reference encountered in the CQL2 tree. */
export function collectCql2Properties(cql2: Cql2Json): string[] {
  const properties: string[] = [];
  walk(cql2 as Cql2Node);
  return properties;

  function walk(node: Cql2Node | null): void {
    if (node === null) return;
    const op = node.op;
    const args = node.args ?? [];

    if (op === "=" || op === "like") {
      const first = args[0];
      if (first !== null && typeof first === "object" && "property" in first) {
        const p = (first as { property: unknown }).property;
        if (typeof p === "string") properties.push(p);
      }
      return;
    }

    if (op === "a_containedBy") {
      const second = args[1];
      if (second !== null && typeof second === "object" && "property" in second) {
        const p = (second as { property: unknown }).property;
        if (typeof p === "string") properties.push(p);
      }
      return;
    }

    if (op === "array_filter") {
      // First arg is the "debrief:platforms" ref (accepted by definition).
      // Inner predicate uses platform fields — validated separately by
      // collectPlatformFieldRefs. Do NOT descend here.
      return;
    }

    if (op === "not" || op === "and" || op === "or") {
      for (const child of args) {
        walk(asCql2Node(child));
      }
    }
  }
}

/**
 * Inside an `array_filter`, equality leaves use `{property: <platform field>}`.
 * Collect those fields so we can validate them against `VALID_PLATFORM_FIELDS`.
 */
function collectPlatformFieldRefs(cql2: Cql2Json): string[] {
  const fields: string[] = [];
  walk(cql2 as Cql2Node, false);
  return fields;

  function walk(node: Cql2Node | null, insideArrayFilter: boolean): void {
    if (node === null) return;
    const op = node.op;
    const args = node.args ?? [];

    if (op === "array_filter") {
      walk(asCql2Node(args[1]), true);
      return;
    }

    if (insideArrayFilter && op === "=") {
      const first = args[0];
      if (first !== null && typeof first === "object" && "property" in first) {
        const p = (first as { property: unknown }).property;
        if (typeof p === "string") fields.push(p);
      }
      return;
    }

    if (op === "and" || op === "or" || op === "not") {
      for (const child of args) {
        walk(asCql2Node(child), insideArrayFilter);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/** Normalise the list of unrecognised terms for case-insensitive comparison. */
function canonicaliseTerm(term: string): string {
  return term.trim().toLowerCase();
}

export function parseResponse(
  phrase: string,
  rawResponse: string,
  promptHash: string,
  promptVersion: string,
): GenerationResult {
  const responseHash = sha256(rawResponse);

  // Stage 1: JSON parse
  let json: unknown;
  try {
    json = JSON.parse(rawResponse);
  } catch (e) {
    return failure(
      phrase,
      rawResponse,
      promptHash,
      promptVersion,
      "malformed-json",
      `Response is not valid JSON: ${(e as Error).message}`,
    );
  }

  // Stage 2: shape check
  const shape = asShape(json);
  if (shape === null) {
    return failure(
      phrase,
      rawResponse,
      promptHash,
      promptVersion,
      "schema-violation",
      `Response does not match the required {cql2, lozenges, unrecognisedTerms} shape`,
    );
  }

  // Stage 3: PROPERTY_MAP field check (top-level + platform fields).
  // Runs BEFORE the round-trip so "unknown property" gets the more specific
  // `hallucinated-field` reason rather than the generic `cql2-evaluation-failed`
  // (the reverse parser's Cql2ParseError fires on the same condition).
  const topProperties = collectCql2Properties(shape.cql2);
  for (const property of topProperties) {
    // "debrief:platforms" is accepted as the array_filter first arg elsewhere;
    // not reachable here because collectCql2Properties skips the array_filter
    // first arg. So any property reaching this loop must live in PROPERTY_MAP.
    if (!VALID_TOP_LEVEL_PROPERTIES.has(property)) {
      return failure(
        phrase,
        rawResponse,
        promptHash,
        promptVersion,
        "hallucinated-field",
        `CQL2 references property "${property}" not in PROPERTY_MAP`,
        {
          cql2: shape.cql2,
          lozenges: shape.lozenges,
          unrecognisedTerms: shape.unrecognisedTerms,
        },
      );
    }
  }
  const platformFields = collectPlatformFieldRefs(shape.cql2);
  for (const field of platformFields) {
    if (!VALID_PLATFORM_FIELDS.has(field)) {
      return failure(
        phrase,
        rawResponse,
        promptHash,
        promptVersion,
        "hallucinated-field",
        `array_filter references unknown platform field "${field}"`,
        {
          cql2: shape.cql2,
          lozenges: shape.lozenges,
          unrecognisedTerms: shape.unrecognisedTerms,
        },
      );
    }
  }

  // Stage 4: CQL2 round-trip — catches unsupported operators and bad arity
  // (properties were already validated above, so any remaining parser error
  // is a true evaluation failure).
  try {
    cql2JsonToFilterExpression(shape.cql2);
  } catch (e) {
    if (e instanceof Cql2ParseError) {
      return failure(
        phrase,
        rawResponse,
        promptHash,
        promptVersion,
        "cql2-evaluation-failed",
        e.message,
        {
          cql2: shape.cql2,
          lozenges: shape.lozenges,
          unrecognisedTerms: shape.unrecognisedTerms,
        },
      );
    }
    throw e;
  }

  // Stage 5: unrecognised-term leak visitor
  if (shape.unrecognisedTerms.length > 0) {
    const unrecognised = new Set(shape.unrecognisedTerms.map(canonicaliseTerm));
    const leaked = collectCql2Values(shape.cql2)
      .map(canonicaliseTerm)
      .filter((v) => unrecognised.has(v));
    if (leaked.length > 0) {
      return failure(
        phrase,
        rawResponse,
        promptHash,
        promptVersion,
        "unrecognised-term-leaked",
        `Unrecognised terms leaked into CQL2 values: ${leaked.join(", ")}`,
        {
          cql2: shape.cql2,
          lozenges: shape.lozenges,
          unrecognisedTerms: shape.unrecognisedTerms,
        },
      );
    }
  }

  // All stages passed.
  return {
    phrase,
    cql2: shape.cql2,
    lozenges: shape.lozenges,
    unrecognisedTerms: shape.unrecognisedTerms,
    error: null,
    diagnostics: {
      promptVersion,
      promptHash,
      responseHash,
      usedLlm: true,
    },
  };
}

export { sha256 };

/**
 * LLM response validation boundary (#188 decisions 8A, 10A).
 *
 * Takes the raw LLM response string and produces a typed `GenerationResult`.
 * Never throws: every runtime failure populates `error` with one of the five
 * `GenerationErrorReason` values.
 *
 * Validation stages (short-circuits on first failure):
 *   1. JSON parse       → `malformed-json`
 *   2. Schema shape     → `schema-violation`
 *   3. CQL2 round-trip  → `cql2-evaluation-failed`
 *   4. PROPERTY_MAP     → `hallucinated-field` (property outside the map)
 *   5. Leak visitor     → `unrecognised-term-leaked`
 */

import {
  Cql2ReverseParseError,
  cql2JsonToFilterExpression,
  PROPERTY_MAP,
} from "../filter-engine";
import type { FilterType } from "../filter-engine";
import type {
  Cql2Json,
  GenerationError,
  GenerationDiagnostics,
  GenerationResult,
  LozengeSeed,
} from "./types";
import { sha256Hex } from "./hash";

const ALLOWED_FILTER_TYPES: ReadonlySet<FilterType> = new Set(
  Object.keys(PROPERTY_MAP) as FilterType[],
);

const ALLOWED_PROPERTY_PATHS: ReadonlySet<string> = new Set(
  Object.values(PROPERTY_MAP),
);

/**
 * Property paths that are valid _inside_ an `array_filter(debrief:platforms,
 * ...)` predicate body. These are bare platform fields — not the full
 * `debrief:platforms[*].field` paths that appear at the top level.
 */
const ALLOWED_PLATFORM_FIELDS: ReadonlySet<string> = new Set([
  "id",
  "name",
  "nationality",
  "vessel_class",
  "vessel_type",
  "vessel_role",
  "domain",
]);

function makeError(
  phrase: string,
  diagnostics: GenerationDiagnostics,
  err: GenerationError,
): GenerationResult {
  return {
    phrase,
    cql2: {},
    lozenges: [],
    unrecognisedTerms: [],
    error: err,
    diagnostics,
  };
}

/**
 * Tree walker: collect every scalar value that appears as the right-hand side
 * of `=` / `like` / `a_containedBy` comparisons across the CQL2 tree.
 *
 * Used by the unrecognised-term leak visitor. Recurses through `and`/`or`/
 * `not`/`array_filter` children so leaks inside compound predicates are
 * detected.
 */
function collectPredicateValues(node: unknown, out: string[]): void {
  if (typeof node !== "object" || node === null) return;
  const obj = node as Record<string, unknown>;
  const op = obj.op;
  const args = Array.isArray(obj.args) ? obj.args : [];

  if (op === "=" && args.length >= 2) {
    const v = args[1];
    if (typeof v === "string") out.push(v);
    return;
  }
  if (op === "like" && args.length >= 2) {
    const v = args[1];
    if (typeof v === "string") out.push(v.replace(/^%/, "").replace(/%$/, ""));
    return;
  }
  if (op === "a_containedBy" && args.length >= 2) {
    const valueList = args[0];
    if (Array.isArray(valueList)) {
      for (const v of valueList) {
        if (typeof v === "string") out.push(v);
      }
    }
    return;
  }

  // and / or / not / array_filter: recurse
  for (const child of args) {
    if (typeof child === "object" && child !== null) {
      collectPredicateValues(child, out);
    }
  }
}

/**
 * Walk the CQL2 tree and collect every `property` string that appears on a
 * property reference. Used to check for hallucinated property paths.
 */
function collectPropertyPaths(node: unknown, out: string[]): void {
  if (typeof node !== "object" || node === null) return;
  if (Array.isArray(node)) {
    for (const child of node) collectPropertyPaths(child, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj.property === "string") {
    out.push(obj.property);
  }
  for (const value of Object.values(obj)) {
    collectPropertyPaths(value, out);
  }
}

/** Shape of the expected LLM JSON response (internal pre-validation view). */
interface RawResponse {
  cql2: unknown;
  lozenges: unknown;
  unrecognised_terms: unknown;
}

function validateShape(
  parsed: unknown,
): { ok: true; value: RawResponse } | { ok: false; message: string } {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, message: "response is not a JSON object" };
  }
  const obj = parsed as Record<string, unknown>;
  if (!("cql2" in obj)) return { ok: false, message: "missing `cql2`" };
  if (!("lozenges" in obj)) return { ok: false, message: "missing `lozenges`" };
  if (!("unrecognised_terms" in obj))
    return { ok: false, message: "missing `unrecognised_terms`" };

  if (typeof obj.cql2 !== "object" || obj.cql2 === null || Array.isArray(obj.cql2)) {
    return { ok: false, message: "`cql2` must be an object" };
  }
  if (!Array.isArray(obj.lozenges)) {
    return { ok: false, message: "`lozenges` must be an array" };
  }
  for (const entry of obj.lozenges) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return { ok: false, message: "each lozenge must be an object" };
    }
    const l = entry as Record<string, unknown>;
    if (typeof l.filterType !== "string") {
      return { ok: false, message: "lozenge.filterType must be a string" };
    }
    if (!ALLOWED_FILTER_TYPES.has(l.filterType as FilterType)) {
      return {
        ok: false,
        message: `lozenge.filterType "${l.filterType}" is not in the allowed FilterType union`,
      };
    }
    if (typeof l.value !== "string" || l.value.length === 0) {
      return { ok: false, message: "lozenge.value must be a non-empty string" };
    }
    if (l.negated !== undefined && typeof l.negated !== "boolean") {
      return { ok: false, message: "lozenge.negated must be a boolean when present" };
    }
  }
  if (!Array.isArray(obj.unrecognised_terms)) {
    return { ok: false, message: "`unrecognised_terms` must be an array" };
  }
  for (const entry of obj.unrecognised_terms) {
    if (typeof entry !== "string") {
      return { ok: false, message: "each unrecognised term must be a string" };
    }
  }
  return {
    ok: true,
    value: {
      cql2: obj.cql2,
      lozenges: obj.lozenges,
      unrecognised_terms: obj.unrecognised_terms,
    },
  };
}

/**
 * Inspect every property path in the CQL2 tree; return the first hallucinated
 * path (outside PROPERTY_MAP and the bare platform fields) or null.
 */
function findHallucinatedProperty(cql2: Cql2Json): string | null {
  const paths: string[] = [];
  collectPropertyPaths(cql2, paths);
  for (const path of paths) {
    if (path === "debrief:platforms") continue; // array_filter array reference
    if (ALLOWED_PROPERTY_PATHS.has(path)) continue; // top-level property
    if (ALLOWED_PLATFORM_FIELDS.has(path)) continue; // inside array_filter
    return path;
  }
  return null;
}

/**
 * Check that no `unrecognised_terms` value appears as a predicate value in the
 * CQL2 tree. Returns the first leaked term or null.
 */
function findLeakedUnrecognisedTerm(
  cql2: Cql2Json,
  unrecognised: readonly string[],
): string | null {
  if (unrecognised.length === 0) return null;
  const values: string[] = [];
  collectPredicateValues(cql2, values);
  const lowerSet = new Set(unrecognised.map((t) => t.toLowerCase()));
  for (const v of values) {
    if (lowerSet.has(v.toLowerCase())) return v;
  }
  return null;
}

/**
 * Parse and validate a raw LLM response. Never throws; populates `error`
 * instead.
 *
 * `promptHash` and `promptVersion` are copied into the diagnostics and also
 * used by the caller to decide whether to invoke the LLM or short-circuit.
 */
export async function parseResponse(
  phrase: string,
  rawResponse: string,
  promptHash: string,
  promptVersion: string,
): Promise<GenerationResult> {
  const responseHash = await sha256Hex(rawResponse);
  const diagnostics: GenerationDiagnostics = {
    promptHash,
    promptVersion,
    responseHash,
    usedLlm: true,
  };

  // Stage 1: JSON parse
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return makeError(phrase, diagnostics, {
      reason: "malformed-json",
      message: `Response is not valid JSON: ${message}`,
      rawResponse,
    });
  }

  // Stage 2: shape
  const shaped = validateShape(parsed);
  if (!shaped.ok) {
    return makeError(phrase, diagnostics, {
      reason: "schema-violation",
      message: shaped.message,
      rawResponse,
    });
  }
  const { cql2, lozenges, unrecognised_terms } = shaped.value;

  const typedCql2 = cql2 as Cql2Json;
  const typedLozenges = lozenges as LozengeSeed[];
  const typedUnrec = unrecognised_terms as string[];

  // Stage 3: CQL2 round-trip via the reverse parser
  try {
    cql2JsonToFilterExpression(typedCql2);
  } catch (err) {
    if (err instanceof Cql2ReverseParseError) {
      return makeError(phrase, diagnostics, {
        reason: "cql2-evaluation-failed",
        message: `CQL2 parse failed (${err.code}): ${err.message}`,
        rawResponse,
      });
    }
    const message = err instanceof Error ? err.message : String(err);
    return makeError(phrase, diagnostics, {
      reason: "cql2-evaluation-failed",
      message: `Unexpected error parsing CQL2: ${message}`,
      rawResponse,
    });
  }

  // Stage 4: hallucinated-field check
  const hallucinated = findHallucinatedProperty(typedCql2);
  if (hallucinated) {
    return makeError(phrase, diagnostics, {
      reason: "hallucinated-field",
      message: `CQL2 references property not in PROPERTY_MAP: ${hallucinated}`,
      rawResponse,
    });
  }

  // Stage 5: unrecognised-term leak check
  const leaked = findLeakedUnrecognisedTerm(typedCql2, typedUnrec);
  if (leaked !== null) {
    return makeError(phrase, diagnostics, {
      reason: "unrecognised-term-leaked",
      message: `Unrecognised term "${leaked}" leaked into CQL2 predicate`,
      rawResponse,
    });
  }

  return {
    phrase,
    cql2: typedCql2,
    lozenges: typedLozenges,
    unrecognisedTerms: typedUnrec,
    error: null,
    diagnostics,
  };
}

/**
 * CQL2 Filter Engine — factory and evaluation (#126).
 *
 * Creates a filter engine instance that evaluates FilterExpression
 * against arrays of StacBrowserItem using AND/OR logic.
 */

import type {
  FilterEngine,
  FilterEngineConfig,
  FilterExpression,
  StacBrowserItem,
  VesselTaxonomyNode,
} from "./types";
import { buildDescendantMap } from "./taxonomy";
import { getMatcher, matchArrayFilter } from "./matchers";
import {
  cql2JsonToFilterExpression,
  filterExpressionToCql2Json,
} from "./cql2-json";

/**
 * Create a filter engine instance.
 *
 * @param config - Engine configuration including vessel taxonomy
 * @returns A FilterEngine ready to evaluate expressions
 */
export function createFilterEngine(config: FilterEngineConfig): FilterEngine {
  const descendantMap = buildDescendantMap(config.taxonomy);

  function matches(
    item: StacBrowserItem,
    expression: FilterExpression,
  ): boolean {
    const arrayFilters = expression.arrayFilters ?? [];

    // Empty expression matches all
    if (
      expression.predicates.length === 0 &&
      expression.orGroups.length === 0 &&
      arrayFilters.length === 0
    ) {
      return true;
    }

    // All top-level predicates must match (AND)
    for (const predicate of expression.predicates) {
      const matcher = getMatcher(predicate.type);
      const result = matcher(item, predicate.value, descendantMap);
      if (predicate.negated ? result : !result) {
        return false;
      }
    }

    // Each OR group must have at least one matching predicate
    for (const group of expression.orGroups) {
      const groupMatch = group.predicates.some((predicate) => {
        const matcher = getMatcher(predicate.type);
        const result = matcher(item, predicate.value, descendantMap);
        return predicate.negated ? !result : result;
      });
      if (!groupMatch) {
        return false;
      }
    }

    // All array filters must match (AND)
    for (const af of arrayFilters) {
      if (!matchArrayFilter(item, af, descendantMap)) {
        return false;
      }
    }

    return true;
  }

  function filter(
    items: readonly StacBrowserItem[],
    expression: FilterExpression,
  ): StacBrowserItem[] {
    // Fast path: empty expression returns all items
    if (
      expression.predicates.length === 0 &&
      expression.orGroups.length === 0 &&
      (expression.arrayFilters ?? []).length === 0
    ) {
      return [...items];
    }

    return items.filter((item) => matches(item, expression));
  }

  function toCql2Json(
    expression: FilterExpression,
  ): Record<string, unknown> {
    return filterExpressionToCql2Json(expression);
  }

  return { filter, matches, toCql2Json };
}

/**
 * Convenience wrapper: parse CQL2-JSON into a `FilterExpression`, then filter.
 *
 * Added by #188 (decision 1A) alongside the full reverse parser. Consumers
 * that already hold a `FilterExpression` should prefer `createFilterEngine`;
 * this helper is for downstream callers (the NL→CQL2 harness, future transport
 * layers in #190) that start from a CQL2-JSON object.
 *
 * The optional `config` lets callers pass vessel-class taxonomy so
 * hierarchical expansion works (e.g. `vessel_class=submarine` matching
 * `subsurface/submarine/ssk/type212`). When omitted, the engine runs with
 * an empty taxonomy — fine for predicates that do not depend on vessel-class
 * expansion.
 */
export function filterByCql2Json<T extends StacBrowserItem>(
  items: readonly T[],
  cql2: Record<string, unknown>,
  config: FilterEngineConfig = { taxonomy: [] as readonly VesselTaxonomyNode[] },
): T[] {
  const expression = cql2JsonToFilterExpression(cql2);
  const engine = createFilterEngine(config);
  // createFilterEngine.filter is typed against readonly StacBrowserItem[]; we
  // narrow back to T[] since we never mutate individual items.
  return engine.filter(items, expression) as T[];
}

/**
 * Convert a raw vessel-class tree (as shipped in `shared/data/enum-bundle.json`
 * or similar) into the `VesselTaxonomyNode[]` shape expected by
 * `createFilterEngine`.
 *
 * The enum-bundle tree nests `_class.full_name` alongside child keys; this
 * helper strips the metadata entries and recurses.
 */
export function vesselClassTreeToTaxonomy(
  tree: Readonly<Record<string, unknown>>,
): VesselTaxonomyNode[] {
  function walk(
    subtree: Readonly<Record<string, unknown>>,
  ): VesselTaxonomyNode[] {
    const nodes: VesselTaxonomyNode[] = [];
    for (const [id, node] of Object.entries(subtree)) {
      if (id === "_class") continue;
      if (typeof node !== "object" || node === null) continue;
      const obj = node as Record<string, unknown>;
      const classMeta = obj._class as { full_name?: string } | undefined;
      const label =
        classMeta && typeof classMeta.full_name === "string"
          ? classMeta.full_name
          : id;
      const childrenTree: Record<string, unknown> = {};
      for (const [childKey, childVal] of Object.entries(obj)) {
        if (childKey === "_class") continue;
        childrenTree[childKey] = childVal;
      }
      const children = Object.keys(childrenTree).length > 0
        ? walk(childrenTree)
        : undefined;
      nodes.push(
        children
          ? { id, label, children }
          : { id, label },
      );
    }
    return nodes;
  }
  return walk(tree);
}


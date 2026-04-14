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
} from "./types";
import { buildDescendantMap } from "./taxonomy";
import { getMatcher, matchArrayFilter } from "./matchers";
import { filterExpressionToCql2Json } from "./cql2-json";

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

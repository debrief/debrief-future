/**
 * DTG (Date-Time Group) formatter — `DDHHmmZ MMM YY` in UTC.
 *
 * Example: `2026-04-20T15:00:00Z` → `"201500Z APR 26"`.
 *
 * On parse failure (e.g. input not ISO-8601), the formatter returns the
 * input string verbatim. This mirrors the spec default: `title` falls
 * back to ISO-8601 when DTG cannot be computed.
 *
 * Sync, pure, locale-invariant. Consumers: #216 (capture — Scene title
 * default) and #218 (edit — rename prompt default).
 */
export declare function formatDtg(isoInstant: string): string;
//# sourceMappingURL=dtg.d.ts.map
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

const MONTH_ABBREV = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatDtg(isoInstant: string): string {
  if (typeof isoInstant !== "string" || isoInstant.length === 0) {
    return isoInstant;
  }
  const date = new Date(isoInstant);
  const epoch = date.getTime();
  if (Number.isNaN(epoch)) {
    return isoInstant;
  }
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const month = MONTH_ABBREV[date.getUTCMonth()];
  const year = date.getUTCFullYear() % 100;
  return `${pad2(day)}${pad2(hour)}${pad2(minute)}Z ${month} ${pad2(year)}`;
}

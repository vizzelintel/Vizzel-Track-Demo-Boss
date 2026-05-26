/** Safe number/string formatters for dashboard & tables (avoid runtime crashes on null API fields). */

export function formatLocaleNumber(
  value: unknown,
  locales?: string | string[],
  options?: Intl.NumberFormatOptions,
): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(locales, options);
}

export function truncateLabel(value: unknown, maxLen = 15): string {
  const s = value == null ? "" : String(value);
  if (s.length <= maxLen) return s;
  return `${s.substring(0, maxLen)}...`;
}

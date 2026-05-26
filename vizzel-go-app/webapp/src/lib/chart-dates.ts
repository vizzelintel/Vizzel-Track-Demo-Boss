/** Parse dashboard chart period keys (ISO, YYYY-MM, year, Thai labels). */

export function parseChartDate(
  raw: string | number | null | undefined,
): Date | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(raw).trim();
  if (!s) return null;

  const iso = new Date(s);
  if (!Number.isNaN(iso.getTime())) return iso;

  const ym = /^(\d{4})-(\d{1,2})$/.exec(s);
  if (ym) {
    const d = new Date(Number(ym[1]), Number(ym[2]) - 1, 1);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const yOnly = /^(\d{4})$/.exec(s);
  if (yOnly) {
    const y = Number(yOnly[1]);
    const year = y >= 2400 ? y - 543 : y;
    const d = new Date(year, 5, 1);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

export function coerceChartDateIso(
  raw: string | number | null | undefined,
): string {
  const d = parseChartDate(raw);
  return d ? d.toISOString() : "";
}

export function toBuddhistYear(year: number): number {
  if (!Number.isFinite(year)) return NaN;
  return year + 543;
}

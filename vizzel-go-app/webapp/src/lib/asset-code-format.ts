// Helpers for parsing/formatting Vizzel asset codes.
//
// Vizzel splits asset identifiers into two distinct fields:
//   - `elaasCode`     e.g. "101-630926-00001"  (national Elaas registry code)
//   - `assetNumber`   e.g. "001-43-0001"       (local อปท. asset number)
//
// Excel exports and many legacy data sources combine them into a single
// "elaas (XXX YY ZZZZ)" cell, which these helpers parse and produce.

/**
 * Pattern used to detect a combined "<elaas> (XXX YY ZZZZ)" cell.
 * The inner group may use spaces or dashes between segments.
 */
const COMBINED_PATTERN = /^\s*([\d-]+)\s*\(([\d\s-]+)\)\s*$/;

/**
 * Parse a combined cell into separate elaas and asset-number fields.
 * If the input does not match the combined pattern it is treated as a
 * standalone asset number and the elaas code is returned empty.
 *
 * Examples:
 *   "101-630926-00001 (001 43 0001)" -> { elaasCode: "101-630926-00001", assetNumber: "001-43-0001" }
 *   "001-43-0001"                    -> { elaasCode: "",                  assetNumber: "001-43-0001" }
 *   "101-630926-00001"               -> { elaasCode: "101-630926-00001",  assetNumber: "" }
 */
export function parseAssetCodes(combined: string): {
  elaasCode: string;
  assetNumber: string;
} {
  if (!combined) return { elaasCode: "", assetNumber: "" };
  const trimmed = combined.trim();
  const m = COMBINED_PATTERN.exec(trimmed);
  if (m) {
    const elaasCode = m[1].trim();
    const inner = m[2]
      .trim()
      .split(/[\s-]+/)
      .filter(Boolean)
      .join("-");
    return { elaasCode, assetNumber: inner };
  }
  // Heuristic: standalone elaas codes are long (>=11 chars) and contain two
  // dashes giving three numeric groups (NNN-NNNNNN-NNNNN). Anything else is
  // treated as an asset number.
  const looksLikeElaas = /^\d{2,4}-\d{4,6}-\d{3,6}$/.test(trimmed);
  if (looksLikeElaas) {
    return { elaasCode: trimmed, assetNumber: "" };
  }
  return { elaasCode: "", assetNumber: trimmed };
}

/**
 * Build the combined "elaas (XXX YY ZZZZ)" representation suitable for Excel
 * export. Falls back gracefully if only one of the codes is populated.
 */
export function formatAssetCodesForExport(
  elaasCode: string | null | undefined,
  assetNumber: string | null | undefined,
): string {
  const e = (elaasCode ?? "").trim();
  const a = (assetNumber ?? "").trim();
  if (!e && !a) return "";
  if (!e) return a;
  if (!a) return e;
  // Inner asset number uses spaces between segments in legacy Elaas exports.
  const innerSpaced = a.replace(/-/g, " ");
  return `${e} (${innerSpaced})`;
}

/**
 * Normalise common user input variants for asset numbers into the canonical
 * dashed form `XXX-YY-ZZZZ`. Returns the input unchanged if it does not look
 * like a 3-2-4 digit sequence (so the user can keep typing).
 */
export function autoFormatAssetNumber(input: string): string {
  if (!input) return input;
  const trimmed = input.trim();
  // If it already matches canonical form leave it alone.
  if (/^\d{3}-\d{2}-\d{4}$/.test(trimmed)) return trimmed;
  // Strip every non-digit and check whether we have exactly 9 numeric chars.
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 9) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }
  return trimmed;
}

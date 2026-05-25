import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(
  path: string | null | undefined,
): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;

  // Normalize path: replace backslashes with forward slashes
  const normalizedPath = path.replace(/\\/g, "/");

  // Clean up path: remove "backend/" prefix if present
  let cleanPath = normalizedPath
    .replace(/^backend\//, "")
    .replace(/^frontend\//, "");

  // Ensure path starts with /
  if (!cleanPath.startsWith("/")) {
    cleanPath = `/${cleanPath}`;
  }

  // Get base URL from NEXT_PUBLIC_API_URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  let baseUrl = apiUrl;

  // If API URL ends with /api, remove it to get the root URL
  if (baseUrl.endsWith("/api")) {
    baseUrl = baseUrl.slice(0, -4);
  }

  return `${baseUrl}${cleanPath}`;
}

export function formatThaiDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    calendar: "buddhist",
  }).format(d);
}

// Generate a monochromatic gradient (Dark -> Light) based on count
// High count (index 0) = Dark/Intense color
// Low count (last index) = Light/Pale color
export function generateDistinctColors(count: number): string[] {
  const colors: string[] = [];

  // Base Blue-ish hue (215 is a nice professional blue)
  // We can also shift slightly to Cyan for lighter shades
  const startHue = 215; // Dark Blue
  const endHue = 200; // Light Blue/Cyan

  // Saturation: Start high, end slightly lower
  const startSat = 90;
  const endSat = 70;

  // Lightness: Start Dark (30%), End Light (85%)
  const startLight = 30;
  const endLight = 85;

  for (let i = 0; i < count; i++) {
    // Calculate interpolation factor (0 to 1)
    // If count is 1, t is 0.
    const t = count > 1 ? i / (count - 1) : 0;

    const hue = startHue + (endHue - startHue) * t;
    const saturation = startSat + (endSat - startSat) * t;
    const lightness = startLight + (endLight - startLight) * t;

    colors.push(
      `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`,
    );
  }

  return colors;
}

export function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumberCompact(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

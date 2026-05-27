import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "blue" | "emerald" | "orange" | "purple" | "red" | "amber" | "cyan" | "slate";

const TONE: Record<Tone, { bg: string; text: string; hoverBg: string; watermark: string }> = {
  blue:    { bg: "bg-blue-50",    text: "text-blue-600",    hoverBg: "group-hover:bg-blue-600 group-hover:text-white",       watermark: "text-blue-600" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", hoverBg: "group-hover:bg-emerald-600 group-hover:text-white",    watermark: "text-emerald-600" },
  orange:  { bg: "bg-orange-50",  text: "text-orange-600",  hoverBg: "group-hover:bg-orange-600 group-hover:text-white",     watermark: "text-orange-600" },
  purple:  { bg: "bg-purple-50",  text: "text-purple-600",  hoverBg: "group-hover:bg-purple-600 group-hover:text-white",     watermark: "text-purple-600" },
  red:     { bg: "bg-red-50",     text: "text-red-600",     hoverBg: "group-hover:bg-red-600 group-hover:text-white",        watermark: "text-red-600" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-600",   hoverBg: "group-hover:bg-amber-600 group-hover:text-white",      watermark: "text-amber-600" },
  cyan:    { bg: "bg-cyan-50",    text: "text-cyan-600",    hoverBg: "group-hover:bg-cyan-600 group-hover:text-white",       watermark: "text-cyan-600" },
  slate:   { bg: "bg-slate-100",  text: "text-slate-600",   hoverBg: "group-hover:bg-slate-600 group-hover:text-white",      watermark: "text-slate-600" },
};

export type KpiCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ComponentType<{ className?: string }>;
  tone?: Tone;
  onClick?: () => void;
  className?: string;
  testId?: string;
};

/**
 * Stats card used across dashboards. Mirrors the design from the original
 * VizzelTrack pages: white card, subtle hover, color-toned icon avatar,
 * faded watermark icon in the top-right corner.
 */
export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "blue",
  onClick,
  className,
  testId,
}: KpiCardProps) {
  const t = TONE[tone];
  const Container = onClick ? "button" : "div";
  return (
    <Container
      type={onClick ? "button" : undefined}
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-100/60 bg-white p-5 text-left shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]",
        onClick && "cursor-pointer active:scale-[0.99]",
        className,
      )}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
        <Icon className={cn("-mt-4 -mr-4 h-24 w-24", t.watermark)} />
      </div>
      <div className="relative z-10 flex items-center gap-4">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner transition-colors",
            t.bg,
            t.text,
            t.hoverBg,
          )}
        >
          <Icon className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
            {label}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-slate-900">{value}</p>
          </div>
          {hint && (
            <p className="text-xs font-medium text-slate-400">{hint}</p>
          )}
        </div>
      </div>
    </Container>
  );
}

export function KpiCardGrid({
  children,
  className,
  cols = 4,
}: {
  children: ReactNode;
  className?: string;
  cols?: 2 | 3 | 4;
}) {
  const colCls =
    cols === 2
      ? "md:grid-cols-2"
      : cols === 3
        ? "md:grid-cols-2 lg:grid-cols-3"
        : "md:grid-cols-2 lg:grid-cols-4";
  return (
    <div className={cn("grid grid-cols-1 gap-4", colCls, className)}>
      {children}
    </div>
  );
}

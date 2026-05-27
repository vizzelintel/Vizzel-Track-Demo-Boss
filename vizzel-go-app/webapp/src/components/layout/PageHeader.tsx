import type { ReactNode } from "react";
import { FileDown, FileText, FileUp, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type PageToolbarAction = {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  testId?: string;
};

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Optional left-side icon avatar shown beside the title */
  icon?: ReactNode;
  /** "template / import / export" style cluster (rendered as a single grouped pill) */
  toolbar?: PageToolbarAction[];
  /** Optional secondary actions on the right of the toolbar (e.g. + add) */
  primaryAction?: ReactNode;
  /** Optional content rendered below the title row (e.g. tabs) */
  below?: ReactNode;
};

/**
 * Standard demo-app page header with title + subtitle + grouped toolbar
 * (เทมเพลต / นำเข้า / ส่งออก) + a primary action button.
 *
 * Mirrors the layout used across the original VizzelTrack pages.
 */
export function PageHeader({
  title,
  subtitle,
  icon,
  toolbar,
  primaryAction,
  below,
}: PageHeaderProps) {
  return (
    <header className="z-10 flex-none">
      <div className="flex flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          {icon && (
            <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1
              className="truncate text-xl font-bold tracking-tight text-slate-900 lg:text-2xl"
              data-testid="page-header-title"
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs lg:text-sm">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {toolbar && toolbar.length > 0 && (
            <>
              <div className="hidden h-9 items-center gap-1 rounded-lg border bg-white pr-1 pl-1 shadow-sm sm:flex">
                {toolbar.map((a, i) => (
                  <span key={a.key} className="flex items-center">
                    {i > 0 && <span className="h-4 w-px bg-slate-200" />}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={a.onClick}
                      className="h-7 px-2 text-slate-600 hover:bg-slate-100"
                      data-testid={a.testId}
                    >
                      {a.icon}
                      <span className="ml-1.5">{a.label}</span>
                    </Button>
                  </span>
                ))}
              </div>
              <div className="sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 border-slate-200 bg-white shadow-sm"
                    >
                      <Settings2 className="h-4 w-4 text-slate-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[180px]">
                    {toolbar.map((a) => (
                      <DropdownMenuItem
                        key={a.key}
                        onClick={a.onClick}
                        data-testid={a.testId ? `${a.testId}-menu` : undefined}
                      >
                        {a.icon}
                        <span className="ml-2">{a.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
          {primaryAction}
        </div>
      </div>
      {below && <div className="mt-3">{below}</div>}
    </header>
  );
}

/** Convenience helper that returns the standard เทมเพลต/นำเข้า/ส่งออก trio. */
export function standardImportExportToolbar(opts: {
  onTemplate?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  testIdPrefix?: string;
}): PageToolbarAction[] {
  const p = opts.testIdPrefix ?? "page";
  return [
    {
      key: "template",
      label: "เทมเพลต",
      icon: <FileText className="h-4 w-4" />,
      onClick: opts.onTemplate,
      testId: `${p}-toolbar-template`,
    },
    {
      key: "import",
      label: "นำเข้า",
      icon: <FileDown className="h-4 w-4" />,
      onClick: opts.onImport,
      testId: `${p}-toolbar-import`,
    },
    {
      key: "export",
      label: "ส่งออก",
      icon: <FileUp className="h-4 w-4" />,
      onClick: opts.onExport,
      testId: `${p}-toolbar-export`,
    },
  ];
}

"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Filter, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface AuditJobOption {
  id: number;
  jobCode?: string | null;
  name?: string | null;
  year?: number | null;
  time?: number | null;
  isComplete?: boolean;
  displayName?: string | null;
}

interface AuditJobFilterProps {
  jobs: AuditJobOption[];
  selected: number[];
  onChange: (next: number[]) => void;
  className?: string;
}

function formatJobLabel(job: AuditJobOption): string {
  if (job.displayName) return job.displayName;
  if (job.name) return job.name;
  if (job.jobCode) return job.jobCode;
  const year = job.year ?? "-";
  const time =
    job.time != null ? String(job.time).padStart(3, "0") : "-";
  return `AUD-${year}-${time}`;
}

export function AuditJobFilter({
  jobs,
  selected,
  onChange,
  className,
}: AuditJobFilterProps) {
  const [open, setOpen] = React.useState(false);
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);

  const toggle = (id: number) => {
    if (selectedSet.has(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  };
  const selectAll = () => onChange(jobs.map((j) => j.id));
  const clear = () => onChange([]);

  const selectedJobs = jobs.filter((j) => selectedSet.has(j.id));
  const triggerLabel =
    selected.length === 0
      ? "เลือก Job..."
      : selected.length === jobs.length
      ? `ทุก Job (${jobs.length})`
      : `เลือกไว้ ${selected.length} / ${jobs.length} Job`;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-9 min-w-[220px] justify-between"
              disabled={jobs.length === 0}
            >
              <span className="flex items-center gap-2 truncate">
                <Filter className="h-4 w-4 opacity-70" />
                <span className="truncate">{triggerLabel}</span>
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="start">
            <Command>
              <CommandInput placeholder="ค้นหา Job..." />
              <CommandList>
                <CommandEmpty>ไม่พบ Job</CommandEmpty>
                <CommandGroup>
                  {jobs.map((job) => {
                    const isSelected = selectedSet.has(job.id);
                    const label = formatJobLabel(job);
                    const meta = [
                      job.jobCode && job.jobCode !== label
                        ? job.jobCode
                        : null,
                      job.year ? `ปี ${job.year}` : null,
                      job.isComplete ? "เสร็จสิ้น" : "กำลังดำเนินการ",
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <CommandItem
                        key={job.id}
                        value={`${label} ${job.jobCode ?? ""}`}
                        onSelect={() => toggle(job.id)}
                        className="flex items-start gap-2"
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex h-4 w-4 items-center justify-center rounded-sm border",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input",
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm">{label}</span>
                          {meta && (
                            <span className="text-muted-foreground truncate text-xs">
                              {meta}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup>
                  <div className="flex items-center justify-between gap-2 p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={selectAll}
                      disabled={selected.length === jobs.length}
                    >
                      เลือกทั้งหมด
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={clear}
                      disabled={selected.length === 0}
                    >
                      ล้าง
                    </Button>
                  </div>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {selected.length > 0 && selected.length < jobs.length && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-xs"
            onClick={clear}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            ล้างตัวกรอง
          </Button>
        )}
      </div>

      {selectedJobs.length > 0 && selectedJobs.length < jobs.length && (
        <div className="flex flex-wrap gap-1">
          {selectedJobs.map((job) => (
            <Badge
              key={job.id}
              variant="secondary"
              className="max-w-[220px] truncate"
              title={formatJobLabel(job)}
            >
              <span className="truncate">{formatJobLabel(job)}</span>
              <button
                type="button"
                className="hover:text-foreground ml-1 shrink-0 opacity-70"
                onClick={() => toggle(job.id)}
                aria-label="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

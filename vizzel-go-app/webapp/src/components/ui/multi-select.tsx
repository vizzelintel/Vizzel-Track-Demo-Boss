import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export type Option = {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  searchPlaceholder = "Search...",
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (item: string) => {
    if (disabled) return;
    onChange(selected.filter((i) => i !== item));
  };

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex items-center rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
            disabled
              ? "cursor-not-allowed opacity-50 bg-muted"
              : "cursor-pointer",
            "w-full justify-between h-auto min-h-10",
            className,
          )}
          onClick={() => {
            if (!disabled) setOpen(!open);
          }}
        >
          <div className="flex flex-wrap gap-1">
            {selected.length === 0 && (
              <span className="text-muted-foreground font-normal">
                {placeholder}
              </span>
            )}
            {selected.map((itemValue) => {
              const item = options.find((o) => o.value === itemValue);
              return (
                <Badge
                  variant="secondary"
                  key={itemValue}
                  className="mr-1 mb-1 max-w-[150px] truncate flex items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnselect(itemValue);
                  }}
                  title={item?.label || itemValue} // Show full text on hover
                >
                  <span className="truncate block">
                    {item?.label || itemValue}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="shrink-0 ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUnselect(itemValue);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnselect(itemValue);
                    }}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </span>
                </Badge>
              );
            })}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label} // Use label for search match
                  onSelect={(currentValue) => {
                    // Finding the value based on the label, because CommandItem value is confusing sometimes
                    const found = options.find(
                      (o) =>
                        o.label.toLowerCase() === currentValue.toLowerCase() ||
                        o.value === option.value,
                    );
                    if (!found) return;

                    const isSelected = selected.includes(found.value);
                    if (isSelected) {
                      onChange(selected.filter((s) => s !== found.value));
                    } else {
                      onChange([...selected, found.value]);
                    }
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option.value)
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  {option.icon && (
                    <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  )}
                  <span>{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

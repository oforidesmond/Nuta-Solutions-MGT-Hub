"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface MultiSelectOption<T extends string> {
  value: T;
  label: string;
}

interface MultiSelectDropdownProps<T extends string> {
  label: string;
  options: MultiSelectOption<T>[];
  selected: T[];
  onChange: (next: T[]) => void;
  className?: string;
  emptyLabel?: string;
}

export function MultiSelectDropdown<T extends string>({
  label,
  options,
  selected,
  onChange,
  className,
  emptyLabel = "All",
}: MultiSelectDropdownProps<T>) {
  const triggerLabel =
    selected.length === 0
      ? `${label}: ${emptyLabel}`
      : selected.length === 1
        ? `${label}: ${labelForValue(options, selected[0])}`
        : `${label}: ${selected.length} selected`;

  function toggle(value: T, isOn: boolean) {
    if (isOn) {
      if (!selected.includes(value)) onChange([...selected, value]);
    } else {
      onChange(selected.filter((v) => v !== value));
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("min-w-[10rem] justify-between gap-2", className)}
          />
        }
      >
        <span className="truncate text-left">{triggerLabel}</span>
        <ChevronDown className="size-4 opacity-60" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {/* Base UI: GroupLabel / checkbox items must live under Menu.Group */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {options.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={selected.includes(opt.value)}
              onCheckedChange={(isOn) => toggle(opt.value, isOn)}
            >
              {opt.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        {selected.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="text-xs text-muted-foreground focus:text-accent-foreground"
                onClick={() => onChange([])}
              >
                Clear selection
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function labelForValue<T extends string>(
  options: MultiSelectOption<T>[],
  value: T,
): string {
  const opt = options.find((o) => o.value === value);
  return opt?.label ?? value;
}

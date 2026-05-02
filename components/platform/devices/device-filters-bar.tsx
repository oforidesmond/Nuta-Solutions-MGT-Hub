"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  MultiSelectDropdown,
  type MultiSelectOption,
} from "@/components/platform/multi-select-dropdown";
import { OrgFilterPicker } from "@/components/platform/org-filter-picker";
import type { DeviceStatus } from "@/lib/types/platform";

const STATUS_OPTIONS: MultiSelectOption<DeviceStatus>[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "REVOKED", label: "Revoked" },
];

interface DeviceFiltersBarProps {
  search: string;
  onSearchChange: (next: string) => void;
  status: DeviceStatus[];
  onStatusChange: (next: DeviceStatus[]) => void;
  organizationId: string | undefined;
  onOrganizationIdChange: (next: string | undefined) => void;
  userIdFilter: string;
  onUserIdFilterChange: (next: string) => void;
  onClearAll: () => void;
}

export function DeviceFiltersBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  organizationId,
  onOrganizationIdChange,
  userIdFilter,
  onUserIdFilterChange,
  onClearAll,
}: DeviceFiltersBarProps) {
  const hasActiveFilters =
    search.trim().length > 0 ||
    status.length > 0 ||
    organizationId ||
    userIdFilter.trim().length > 0;

  return (
    <div className="space-y-3 rounded-xl border border-border/40 bg-card p-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search device name, UUID, model, fingerprint…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <OrgFilterPicker organizationId={organizationId} onOrganizationIdChange={onOrganizationIdChange} />
        </div>
        <div className="space-y-2">
          <MultiSelectDropdown<DeviceStatus>
            label="Status"
            options={STATUS_OPTIONS}
            selected={status}
            onChange={onStatusChange}
          />
          <div className="space-y-1">
            <Label htmlFor="device-user-id" className="text-xs text-muted-foreground">
              Owner user ID (UUID)
            </Label>
            <Input
              id="device-user-id"
              placeholder="Optional — narrow to devices owned by…"
              value={userIdFilter}
              onChange={(e) => onUserIdFilterChange(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        {hasActiveFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClearAll}>
            <X className="mr-1 size-3.5" aria-hidden />
            Clear all
          </Button>
        ) : null}
      </div>

      {status.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {status.map((s) => (
            <Badge key={s} variant="outline" className="gap-1.5 pr-1">
              Status: {STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s}
              <button
                type="button"
                onClick={() => onStatusChange(status.filter((v) => v !== s))}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Remove filter ${s}`}
              >
                <X className="size-3" aria-hidden />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

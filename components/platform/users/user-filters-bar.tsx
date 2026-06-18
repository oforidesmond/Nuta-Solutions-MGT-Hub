"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MultiSelectDropdown,
  type MultiSelectOption,
} from "@/components/platform/multi-select-dropdown";
import { OrgFilterPicker } from "@/components/platform/org-filter-picker";
import type { UserRole } from "@/lib/types/domain";

export type UsersActiveFilter = "all" | "active" | "inactive";

const ROLE_OPTIONS: MultiSelectOption<UserRole>[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "STAFF", label: "Staff" },
  { value: "SALES_AGENT", label: "Sales agent" },
  { value: "SUPER_ADMIN", label: "Super admin" },
];

interface UserFiltersBarProps {
  search: string;
  onSearchChange: (next: string) => void;
  role: UserRole[];
  onRoleChange: (next: UserRole[]) => void;
  organizationId: string | undefined;
  onOrganizationIdChange: (next: string | undefined) => void;
  activeFilter: UsersActiveFilter;
  onActiveFilterChange: (next: UsersActiveFilter) => void;
  onClearAll: () => void;
}

export function UserFiltersBar({
  search,
  onSearchChange,
  role,
  onRoleChange,
  organizationId,
  onOrganizationIdChange,
  activeFilter,
  onActiveFilterChange,
  onClearAll,
}: UserFiltersBarProps) {
  const hasActiveFilters =
    search.trim().length > 0 ||
    role.length > 0 ||
    organizationId ||
    activeFilter !== "all";

  return (
    <div className="space-y-3 rounded-xl border border-border/40 bg-card p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search users (name, email)…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <OrgFilterPicker
            organizationId={organizationId}
            onOrganizationIdChange={onOrganizationIdChange}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <MultiSelectDropdown<UserRole>
            label="Role"
            options={ROLE_OPTIONS}
            selected={role}
            onChange={onRoleChange}
          />
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Status</span>
            <select
              value={activeFilter}
              onChange={(e) => onActiveFilterChange(e.target.value as UsersActiveFilter)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring interactive-cursor"
            >
              <option value="all">All</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {hasActiveFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClearAll}>
            <X className="mr-1 size-3.5" aria-hidden />
            Clear all
          </Button>
        ) : null}
      </div>

      {role.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {role.map((r) => (
            <FilterChip
              key={r}
              label={`Role: ${ROLE_OPTIONS.find((o) => o.value === r)?.label ?? r}`}
              onRemove={() => onRoleChange(role.filter((v) => v !== r))}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge variant="outline" className="gap-1.5 pr-1">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground interactive-cursor"
        aria-label={`Remove filter ${label}`}
      >
        <X className="size-3" aria-hidden />
      </button>
    </Badge>
  );
}

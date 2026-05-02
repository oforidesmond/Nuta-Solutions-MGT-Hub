"use client";

import { ArrowDown, ArrowUp, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MultiSelectDropdown,
  type MultiSelectOption,
} from "@/components/platform/multi-select-dropdown";
import type {
  OrganizationListParams,
  PlanStatus,
  PlanType,
} from "@/lib/types/platform";

const PLAN_TYPE_OPTIONS: MultiSelectOption<PlanType>[] = [
  { value: "FREE", label: "Free" },
  { value: "TRIAL", label: "Trial" },
  { value: "PRO", label: "Pro" },
  { value: "ENTERPRISE", label: "Enterprise" },
];

const PLAN_STATUS_OPTIONS: MultiSelectOption<PlanStatus>[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "TRIAL_EXPIRED", label: "Trial expired" },
  { value: "PAYMENT_OVERDUE", label: "Payment overdue" },
];

const SORT_OPTIONS: { value: NonNullable<OrganizationListParams["sortBy"]>; label: string }[] = [
  { value: "createdAt", label: "Created date" },
  { value: "name", label: "Name" },
  { value: "salesCount", label: "Sales count" },
  { value: "trialEndDate", label: "Trial end date" },
];

interface OrgFiltersBarProps {
  search: string;
  onSearchChange: (next: string) => void;
  planType: PlanType[];
  onPlanTypeChange: (next: PlanType[]) => void;
  planStatus: PlanStatus[];
  onPlanStatusChange: (next: PlanStatus[]) => void;
  sortBy: NonNullable<OrganizationListParams["sortBy"]>;
  onSortByChange: (next: NonNullable<OrganizationListParams["sortBy"]>) => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: (next: "asc" | "desc") => void;
  onClearAll: () => void;
}

export function OrgFiltersBar({
  search,
  onSearchChange,
  planType,
  onPlanTypeChange,
  planStatus,
  onPlanStatusChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onClearAll,
}: OrgFiltersBarProps) {
  const hasActiveFilters =
    search.trim().length > 0 || planType.length > 0 || planStatus.length > 0;

  return (
    <div className="space-y-3 rounded-xl border border-border/40 bg-card p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search by name, email, or phone…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <MultiSelectDropdown<PlanType>
          label="Plan"
          options={PLAN_TYPE_OPTIONS}
          selected={planType}
          onChange={onPlanTypeChange}
        />
        <MultiSelectDropdown<PlanStatus>
          label="Status"
          options={PLAN_STATUS_OPTIONS}
          selected={planStatus}
          onChange={onPlanStatusChange}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="org-sort" className="text-xs text-muted-foreground">
          Sort by
        </label>
        <select
          id="org-sort"
          value={sortBy}
          onChange={(e) =>
            onSortByChange(e.target.value as NonNullable<OrganizationListParams["sortBy"]>)
          }
          className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
        >
          {sortOrder === "asc" ? (
            <ArrowUp className="mr-1 size-3.5" aria-hidden />
          ) : (
            <ArrowDown className="mr-1 size-3.5" aria-hidden />
          )}
          {sortOrder === "asc" ? "Ascending" : "Descending"}
        </Button>

        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="ml-auto"
          >
            <X className="mr-1 size-3.5" aria-hidden />
            Clear all
          </Button>
        ) : null}
      </div>

      {planType.length > 0 || planStatus.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {planType.map((p) => (
            <FilterChip
              key={`pt-${p}`}
              label={`Plan: ${PLAN_TYPE_OPTIONS.find((o) => o.value === p)?.label ?? p}`}
              onRemove={() => onPlanTypeChange(planType.filter((v) => v !== p))}
            />
          ))}
          {planStatus.map((s) => (
            <FilterChip
              key={`ps-${s}`}
              label={`Status: ${PLAN_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s}`}
              onRemove={() => onPlanStatusChange(planStatus.filter((v) => v !== s))}
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
        className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Remove filter ${label}`}
      >
        <X className="size-3" aria-hidden />
      </button>
    </Badge>
  );
}

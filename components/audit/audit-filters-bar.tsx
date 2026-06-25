"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductLinkPicker } from "@/components/products/product-link-picker";
import {
  MultiSelectDropdown,
  type MultiSelectOption,
} from "@/components/platform/multi-select-dropdown";
import { fetchStaffList } from "@/lib/api/staff";
import { fetchBranchesList } from "@/lib/api/branches";
import type { HubProduct } from "@/lib/types/domain";
import { TENANT_AUDIT_EVENT_OPTIONS } from "@/lib/types/audit";
import { useAuthStore } from "@/stores/auth-store";

export type AuditFilterState = {
  productId?: string;
  productName?: string;
  userId?: string;
  branchId?: string;
  eventType: string[];
  aggregateType?: string;
  startDate: string;
  endDate: string;
};

export const EMPTY_AUDIT_FILTERS: AuditFilterState = {
  eventType: [],
  startDate: "",
  endDate: "",
};

type Props = {
  filters: AuditFilterState;
  onChange: (next: AuditFilterState) => void;
  onClear: () => void;
};

export function AuditFiltersBar({ filters, onChange, onClear }: Props) {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);

  const branchesQuery = useQuery({
    queryKey: ["branches", "list", "audit-filters"],
    queryFn: fetchBranchesList,
    staleTime: 120_000,
  });

  const staffQuery = useQuery({
    queryKey: ["staff", "list", "audit-filters"],
    queryFn: fetchStaffList,
    staleTime: 120_000,
  });

  const staffOptions: MultiSelectOption<string>[] = useMemo(
    () =>
      (staffQuery.data ?? [])
        .filter((s) => s.isActive !== false)
        .map((s) => ({
          value: s.id,
          label: [s.firstName, s.lastName].filter(Boolean).join(" ").trim() || s.staffId || s.email,
        })),
    [staffQuery.data],
  );

  const branchOptions = useMemo(
    () => [
      { value: "", label: "All branches" },
      ...(branchesQuery.data ?? []).map((b) => ({ value: b.id, label: b.name })),
    ],
    [branchesQuery.data],
  );

  const productValue: HubProduct | null = filters.productId
    ? ({
        id: filters.productId,
        name: filters.productName ?? "Selected product",
      } as HubProduct)
    : null;

  const hasActiveFilters =
    Boolean(filters.productId) ||
    Boolean(filters.userId) ||
    Boolean(filters.branchId && filters.branchId !== activeBranchId) ||
    filters.eventType.length > 0 ||
    Boolean(filters.aggregateType?.trim()) ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate);

  return (
    <div className="space-y-3 rounded-xl border border-border/40 bg-card p-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ProductLinkPicker
          id="audit-product"
          label="Product"
          placeholder="All products"
          value={productValue}
          onChange={(p) =>
            onChange({
              ...filters,
              productId: p?.id,
              productName: p?.name,
            })
          }
        />
        <MultiSelectDropdown
          label="Staff"
          options={staffOptions}
          selected={filters.userId ? [filters.userId] : []}
          onChange={(ids) =>
            onChange({
              ...filters,
              userId: ids[0],
            })
          }
          emptyLabel="All staff"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MultiSelectDropdown
          label="Event type"
          options={TENANT_AUDIT_EVENT_OPTIONS}
          selected={filters.eventType}
          onChange={(eventType) => onChange({ ...filters, eventType })}
        />
        <div className="space-y-1.5">
          <Label htmlFor="audit-branch">Branch</Label>
          <select
            id="audit-branch"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm interactive-cursor"
            value={filters.branchId ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                branchId: e.target.value || undefined,
              })
            }
          >
            {branchOptions.map((b) => (
              <option key={b.value || "all"} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="audit-aggregate">Aggregate type</Label>
          <Input
            id="audit-aggregate"
            placeholder="e.g. Sale, Product"
            value={filters.aggregateType ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                aggregateType: e.target.value.trim() || undefined,
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-start">Start date</Label>
          <Input
            id="audit-start"
            type="date"
            value={filters.startDate}
            onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-end">End date</Label>
          <Input
            id="audit-end"
            type="date"
            value={filters.endDate}
            onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end">
        {hasActiveFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}

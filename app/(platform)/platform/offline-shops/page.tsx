"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, RotateCw, Store } from "lucide-react";
import { fetchOfflineLicenseCustomers } from "@/lib/api/platform/offline-license";
import { handleApiError } from "@/lib/api/errors";
import {
  matchesOfflineShopFilter,
  matchesOfflineShopSearch,
  type OfflineShopStatusFilter,
} from "@/lib/offline-license-status";
import {
  OFFLINE_LICENSE_DEFAULT_AMOUNT_GHS,
  OFFLINE_LICENSE_DEFAULT_PERIOD_DAYS,
} from "@/lib/types/offline-license";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateOfflineShopModal } from "@/components/platform/offline-shops/create-offline-shop-modal";
import { OfflineShopCard } from "@/components/platform/offline-shops/offline-shop-card";
import { OfflineShopsTable } from "@/components/platform/offline-shops/offline-shops-table";
import { cn } from "@/lib/utils";

const FILTERS: { value: OfflineShopStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring soon" },
  { value: "expired", label: "Expired" },
  { value: "not_activated", label: "Not activated" },
  { value: "inactive", label: "Inactive" },
];

export default function OfflineShopsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OfflineShopStatusFilter>("all");

  const query = useQuery({
    queryKey: ["platform", "offline-shops"],
    queryFn: fetchOfflineLicenseCustomers,
  });

  const shops = useMemo(() => {
    const rows = query.data ?? [];
    return rows.filter(
      (shop) =>
        matchesOfflineShopSearch(shop, search) && matchesOfflineShopFilter(shop, statusFilter),
    );
  }, [query.data, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Offline shops</h1>
          <p className="text-sm text-muted-foreground">
            Standalone PWA licenses · default GHS {OFFLINE_LICENSE_DEFAULT_AMOUNT_GHS} /{" "}
            {OFFLINE_LICENSE_DEFAULT_PERIOD_DAYS} days
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RotateCw className={cn("size-4", query.isFetching && "animate-spin")} aria-hidden />
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Add shop
          </Button>
        </div>
      </div>

      <Card className="gap-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-sm space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="offline-shop-search">
              Search
            </label>
            <Input
              id="offline-shop-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, phone, email, or id"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <Button
                key={f.value}
                type="button"
                size="sm"
                variant={statusFilter === f.value ? "default" : "outline"}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {query.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : query.isError ? (
        <Card className="p-6 text-sm text-destructive">{handleApiError(query.error)}</Card>
      ) : shops.length === 0 ? (
        <EmptyState
          icon={<Store className="size-10 text-muted-foreground" aria-hidden />}
          title={(query.data?.length ?? 0) === 0 ? "No offline shops yet" : "No matching shops"}
          description={
            (query.data?.length ?? 0) === 0
              ? "Add a shop, then issue an activation code for their device."
              : "Try a different search or status filter."
          }
          action={
            (query.data?.length ?? 0) === 0
              ? { label: "Add shop", onClick: () => setCreateOpen(true) }
              : undefined
          }
        />
      ) : (
        <>
          <OfflineShopsTable shops={shops} />
          <div className="space-y-3">
            {shops.map((shop) => (
              <OfflineShopCard key={shop.id} shop={shop} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {shops.length}
            {(query.data?.length ?? 0) !== shops.length
              ? ` of ${query.data?.length ?? 0}`
              : ""}{" "}
            shop{(query.data?.length ?? 0) === 1 ? "" : "s"}
          </p>
        </>
      )}

      <CreateOfflineShopModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

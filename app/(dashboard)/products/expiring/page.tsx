"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchExpiringSoonProducts, fetchProducts } from "@/lib/api/products";
import { handleApiError } from "@/lib/api/errors";
import { formatDateDMY } from "@/lib/format";
import type { HubProduct } from "@/lib/types/domain";

function daysUntil(iso: string): number {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return 9999;
  return Math.ceil((d - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function ExpiringSoonProductsPage() {
  const [rows, setRows] = useState<HubProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      try {
        const data = await fetchExpiringSoonProducts();
        setRows(data);
        return;
      } catch (e) {
        if (!axios.isAxiosError(e) || e.response?.status !== 404) {
          throw e;
        }
      }
      const all = await fetchProducts();
      const active = all.filter((p) => p.isActive !== false);
      setRows(
        active.filter((p) => {
          if (!p.nearestExpiryDate) return false;
          const days = daysUntil(p.nearestExpiryDate);
          return days >= 0 && days <= 90;
        }),
      );
    } catch (e) {
      toast.error(handleApiError(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Expiring soon</h1>
        <p className="text-sm text-muted-foreground">Products with batches expiring in the next 90 days.</p>
      </div>

      <Card className="border-border/40 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Upcoming expiry</CardTitle>
          <CardDescription>Sell or discount these first.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming expiries in this window.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {rows.map((p) => {
                const days = p.nearestExpiryDate ? daysUntil(p.nearestExpiryDate) : null;
                return (
                  <li key={p.id} className="flex flex-col gap-2 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Link href={`/products/${p.id}`} className="font-medium text-primary underline-offset-2 hover:underline">
                        {p.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        Nearest expiry: {p.nearestExpiryDate ? formatDateDMY(p.nearestExpiryDate) : "-"}
                      </p>
                    </div>
                    {days != null && days >= 0 ? (
                      <Badge variant={days <= 30 ? "destructive" : "secondary"}>Expires in {days} days</Badge>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

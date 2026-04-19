"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SalesTable } from "@/components/sales/sales-table";
import { fetchSales } from "@/lib/api/sales";
import { useAuthStore } from "@/stores/auth-store";
import type { HubSale } from "@/lib/types/domain";

export default function SalesPage() {
  const currency = useAuthStore((s) => s.organization?.currency) ?? "GHS";
  const [rows, setRows] = useState<HubSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchSales();
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) toast.error("Could not load sales.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
        <p className="text-sm text-muted-foreground">
          Recent transactions for your organization.
        </p>
      </div>
      <Card className="border-border/40 bg-card/80 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <SalesTable rows={rows} currency={currency} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

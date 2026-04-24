import axios from "axios";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { fetchProducts } from "@/lib/api/products";
import { fetchSalesPage, fetchSalesStats } from "@/lib/api/sales";
import { rangeForPreset } from "@/lib/date-range-presets";
import { getStockStatus, productQuantity, productReorderLevel } from "@/lib/stock-status";
import { extractReliabilityFromDashboardPayload } from "@/lib/api/staff-reliability";
import type { DashboardSummary, HubProduct } from "@/lib/types/domain";

function numberFromStats(stats: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    const v = stats[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = parseFloat(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function sumSalesTotals(sales: { totalAmount: string | number }[]): number {
  return sales.reduce((acc, s) => {
    const n = typeof s.totalAmount === "string" ? parseFloat(s.totalAmount) : s.totalAmount;
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

/** Items that need restocking: out of stock or at/below reorder / low threshold. */
function countRestockAttention(products: HubProduct[]): number {
  return products.filter((p) => {
    const q = productQuantity(p);
    const tone = getStockStatus(q, productReorderLevel(p));
    return tone === "low" || tone === "out";
  }).length;
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  try {
    const res = await api.get<DashboardSummary>(endpoints.dashboardSummary);
    const reliability =
      extractReliabilityFromDashboardPayload(res.data) ?? res.data.reliability ?? null;
    return { ...res.data, reliability };
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404) {
      const range = rangeForPreset("this_month");
      const products = await fetchProducts();
      const active = products.filter((p) => p.isActive !== false);
      const inventoryCount = active.length;
      const lowStockCount = countRestockAttention(active);
      const expiringSoonCount = active.filter((p) => {
        if (!p.nearestExpiryDate) return false;
        const d = new Date(p.nearestExpiryDate).getTime();
        const in90 = Date.now() + 90 * 24 * 60 * 60 * 1000;
        return d < in90 && d > Date.now();
      }).length;

      let totalSales = 0;
      try {
        const stats = await fetchSalesStats({
          startDate: range.startDate,
          endDate: range.endDate,
        });
        totalSales = numberFromStats(stats, [
          "totalRevenue",
          "total_revenue",
          "totalSales",
          "total_sales",
          "revenue",
        ]);
      } catch {
        /* ignore */
      }
      if (totalSales === 0) {
        const salesPage = await fetchSalesPage({ page: 1, limit: 500 });
        totalSales = sumSalesTotals(salesPage.data);
      }

      return {
        totalSales,
        inventoryCount,
        lowStockCount,
        expiringSoonCount,
      };
    }
    throw e;
  }
}

import axios from "axios";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { fetchAllProducts } from "@/lib/api/products";
import { fetchSalesPage, fetchSalesStats } from "@/lib/api/sales";
import { rangeForPreset } from "@/lib/date-range-presets";
import { getStockStatus, productQuantity, productReorderLevel } from "@/lib/stock-status";
import { extractReliabilityFromDashboardPayload } from "@/lib/api/staff-reliability";
import { toNumericAmount } from "@/lib/format";
import type { DashboardSummary, HubProduct } from "@/lib/types/domain";

/**
 * Canonical `GET /dashboard/summary` shape (camelCase with snake_case fallbacks below).
 * Seeded QA org spot-check vs Platform Console: totalSales === 2, totalRevenue ≈ 52.31, totalActiveProducts === 4.
 */
function pickNumericField(raw: Record<string, unknown>, keys: string[], fallback: number): number {
  for (const k of keys) {
    if (!(k in raw)) continue;
    const n = toNumericAmount(raw[k] as string | number | null | undefined);
    if (typeof raw[k] === "number" || (typeof raw[k] === "string" && String(raw[k]).trim() !== "")) {
      if (Number.isFinite(n)) return n;
    }
  }
  return fallback;
}

function pickOptionalNumericField(raw: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    if (!(k in raw)) continue;
    const v = raw[k];
    if (v == null) continue;
    const n = toNumericAmount(v as string | number | null | undefined);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function normalizeDashboardPayload(raw: unknown): DashboardSummary {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const reliability =
    extractReliabilityFromDashboardPayload(raw) ??
    (o.reliability as DashboardSummary["reliability"]) ??
    null;
  const totalSales = pickNumericField(o, ["totalSales", "total_sales"], 0);
  const totalRevenue = pickNumericField(o, ["totalRevenue", "total_revenue"], 0);
  const totalActiveProductsOptional = pickOptionalNumericField(o, [
    "totalActiveProducts",
    "total_active_products",
  ]);

  const branchRaw = o.branch;
  const branch =
    branchRaw && typeof branchRaw === "object"
      ? (branchRaw as DashboardSummary["branch"])
      : null;

  const summary: DashboardSummary = {
    branch,
    totalSales,
    totalRevenue,
    totalActiveProducts:
      typeof totalActiveProductsOptional === "number" ? totalActiveProductsOptional : undefined,
    inventoryCount: pickNumericField(o, ["inventoryCount", "inventory_count"], 0),
    lowStockCount: pickNumericField(o, ["lowStockCount", "low_stock_count"], 0),
    expiringSoonCount: pickNumericField(o, ["expiringSoonCount", "expiring_soon_count"], 0),
    todaySales: pickOptionalNumericField(o, ["todaySales", "today_sales"]),
    todayRevenue: pickOptionalNumericField(o, ["todayRevenue", "today_revenue"]),
    inventoryValue: pickOptionalNumericField(o, ["inventoryValue", "inventory_value"]),
    reliability,
  };

  return summary;
}

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
    const res = await api.get(endpoints.dashboardSummary);
    return normalizeDashboardPayload(res.data);
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404) {
      const range = rangeForPreset("this_month");
      const products = await fetchAllProducts();
      const active = products.filter((p) => p.isActive !== false);
      const totalActiveProducts = active.length;
      const inventoryCount = totalActiveProducts;
      const lowStockCount = countRestockAttention(active);
      const expiringSoonCount = active.filter((p) => {
        if (!p.nearestExpiryDate) return false;
        const d = new Date(p.nearestExpiryDate).getTime();
        const in90 = Date.now() + 90 * 24 * 60 * 60 * 1000;
        return d < in90 && d > Date.now();
      }).length;

      let totalRevenueAmount = 0;
      let totalSalesCount = 0;
      let todaySales: number | undefined;
      let todayRevenueAmount: number | undefined;
      try {
        const stats = await fetchSalesStats({
          startDate: range.startDate,
          endDate: range.endDate,
        });
        totalRevenueAmount = numberFromStats(stats, ["totalRevenue", "total_revenue", "revenue"]);
        totalSalesCount = numberFromStats(stats, [
          "totalSales",
          "total_sales",
          "salesCount",
          "sales_count",
          "orderCount",
          "order_count",
        ]);
        todaySales =
          pickOptionalNumericField(stats, ["todaySales", "today_sales"]) ??
          pickOptionalNumericField(stats, ["salesToday", "sales_today"]);
        todayRevenueAmount = pickOptionalNumericField(stats, [
          "todayRevenue",
          "today_revenue",
          "revenueToday",
          "revenue_today",
        ]);
      } catch {
        /* ignore */
      }

      let salesPage: Awaited<ReturnType<typeof fetchSalesPage>> | null = null;
      if (totalRevenueAmount === 0 || totalSalesCount === 0) {
        salesPage = await fetchSalesPage({ page: 1, limit: 500 });
      }
      if (totalRevenueAmount === 0 && salesPage) {
        totalRevenueAmount = sumSalesTotals(salesPage.data);
      }
      if (totalSalesCount === 0 && salesPage) {
        totalSalesCount = salesPage.total > 0 ? salesPage.total : salesPage.data.length;
      }

      return {
        totalSales: totalSalesCount,
        totalRevenue: totalRevenueAmount,
        totalActiveProducts,
        inventoryCount,
        lowStockCount,
        expiringSoonCount,
        todaySales,
        todayRevenue: todayRevenueAmount,
      };
    }
    throw e;
  }
}

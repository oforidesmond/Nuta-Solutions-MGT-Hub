import axios from "axios";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { fetchProducts } from "@/lib/api/products";
import { fetchSales } from "@/lib/api/sales";
import type { DashboardSummary } from "@/lib/types/domain";

function sumSalesTotals(sales: { totalAmount: string | number }[]): number {
  return sales.reduce((acc, s) => {
    const n = typeof s.totalAmount === "string" ? parseFloat(s.totalAmount) : s.totalAmount;
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  try {
    const res = await api.get<DashboardSummary>(endpoints.dashboardSummary);
    return res.data;
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404) {
      const [products, sales] = await Promise.all([fetchProducts(), fetchSales()]);
      const inventoryCount = products.filter((p) => p.isActive !== false).length;
      const lowStock = products.filter((p) => {
        const q = Number(p.currentStock ?? 0);
        return Number.isFinite(q) && q > 0 && q <= 5;
      }).length;
      const expiringSoon = products.filter((p) => {
        if (!p.nearestExpiryDate) return false;
        const d = new Date(p.nearestExpiryDate).getTime();
        const in90 = Date.now() + 90 * 24 * 60 * 60 * 1000;
        return d < in90 && d > Date.now();
      }).length;
      return {
        totalSales: sumSalesTotals(sales),
        inventoryCount,
        lowStockCount: lowStock,
        expiringSoonCount: expiringSoon,
      };
    }
    throw e;
  }
}

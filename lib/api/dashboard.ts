import axios from "axios";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { fetchProducts } from "@/lib/api/products";
import { fetchSales } from "@/lib/api/sales";
import { getStockStatus, productQuantity, productReorderLevel } from "@/lib/stock-status";
import type { DashboardSummary, HubProduct } from "@/lib/types/domain";

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
    return res.data;
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404) {
      const [products, sales] = await Promise.all([fetchProducts(), fetchSales()]);
      const active = products.filter((p) => p.isActive !== false);
      const inventoryCount = active.length;
      const lowStockCount = countRestockAttention(active);
      const expiringSoonCount = active.filter((p) => {
        if (!p.nearestExpiryDate) return false;
        const d = new Date(p.nearestExpiryDate).getTime();
        const in90 = Date.now() + 90 * 24 * 60 * 60 * 1000;
        return d < in90 && d > Date.now();
      }).length;
      return {
        totalSales: sumSalesTotals(sales),
        inventoryCount,
        lowStockCount,
        expiringSoonCount,
      };
    }
    throw e;
  }
}

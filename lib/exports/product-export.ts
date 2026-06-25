import type { ExportColumn } from "@/components/exports/export-button";
import { productCategoryLabel } from "@/lib/product-helpers";
import {
  getStockStatus,
  productQuantity,
  productReorderLevel,
  type StockStatusTone,
} from "@/lib/stock-status";
import type { HubProduct } from "@/lib/types/domain";

function stockStatusLabel(tone: StockStatusTone): string {
  if (tone === "out") return "Out of stock";
  if (tone === "low") return "Low stock";
  return "In stock";
}

export const PRODUCT_LIST_EXPORT_COLUMNS: ExportColumn[] = [
  { key: "name", header: "Product" },
  { key: "sku", header: "SKU" },
  { key: "barcode", header: "Barcode" },
  { key: "category", header: "Category" },
  { key: "stockQuantity", header: "Stock" },
  { key: "stockStatus", header: "Stock status" },
  { key: "reorderLevel", header: "Reorder level" },
  { key: "costPrice", header: "Cost price" },
  { key: "sellingPrice", header: "Selling price" },
  { key: "unit", header: "Unit" },
  { key: "isActive", header: "Active" },
  { key: "nearestExpiryDate", header: "Nearest expiry" },
  { key: "createdAt", header: "Created" },
];

export function productToExportRow(product: HubProduct): Record<string, unknown> {
  const quantity = productQuantity(product);
  const tone = getStockStatus(quantity, productReorderLevel(product));
  return {
    name: product.name,
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    category: productCategoryLabel(product),
    stockQuantity: quantity,
    stockStatus: stockStatusLabel(tone),
    reorderLevel: productReorderLevel(product) ?? "",
    costPrice: product.costPrice ?? "",
    sellingPrice: product.sellingPrice ?? "",
    unit: product.unit ?? product.unitOfMeasure ?? "",
    isActive: product.isActive === false ? "No" : "Yes",
    nearestExpiryDate: product.nearestExpiryDate ?? "",
    createdAt: product.createdAt ?? "",
  };
}

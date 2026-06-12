import type { HubProduct } from "@/lib/types/domain";

export function productCategoryLabel(p: HubProduct): string {
  const c = p.category;
  if (c == null) return "-";
  if (typeof c === "string") return c || "-";
  return c.name || "-";
}

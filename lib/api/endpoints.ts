/** Central list of API paths — align with Nest controllers. */
export const endpoints = {
  auth: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    handoff: "/auth/handoff",
    handoffConsume: "/auth/handoff/consume",
  },
  users: {
    me: "/users/me",
    list: "/users",
    createStaff: "/users/staff",
  },
  organizations: {
    byId: (id: string) => `/organizations/${id}` as const,
  },
  products: "/products",
  productById: (id: string) => `/products/${id}` as const,
  productPricing: (id: string) => `/products/${id}/pricing` as const,
  productDuplicate: (id: string) => `/products/${id}/duplicate` as const,
  productStockHistory: (id: string) => `/products/${id}/stock-history` as const,
  productsLowStock: "/products/low-stock",
  productsExpiringSoon: "/products/expiring-soon",
  categories: "/categories",
  categoryById: (id: string) => `/categories/${id}` as const,
  categoryProducts: (id: string) => `/categories/${id}/products` as const,
  batches: "/batches",
  batchById: (id: string) => `/batches/${id}` as const,
  batchesExpiring: "/batches/expiring",
  batchesExpired: "/batches/expired",
  batchRemoveExpired: (id: string) => `/batches/${id}/remove-expired` as const,
  sales: "/sales",
  dashboardSummary: "/dashboard/summary",
} as const;

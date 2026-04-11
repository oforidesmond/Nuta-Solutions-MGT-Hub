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
  sales: "/sales",
  dashboardSummary: "/dashboard/summary",
} as const;

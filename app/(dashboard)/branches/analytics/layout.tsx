"use client";

import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { canViewOrgAnalytics } from "@/lib/branch-access";
import { useAuthStore } from "@/stores/auth-store";

export default function OrgAnalyticsLayout({ children }: { children: ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!canViewOrgAnalytics(role)) {
    return (
      <EmptyState
        title="Restricted"
        description="Only organisation administrators can view org-wide analytics. These endpoints roll up data across all branches and require an admin account."
      />
    );
  }
  return <>{children}</>;
}

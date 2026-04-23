"use client";

import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { canViewStaffReliability } from "@/lib/operations-access";
import { useAuthStore } from "@/stores/auth-store";

export default function OperationsLayout({ children }: { children: ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!canViewStaffReliability(role)) {
    return (
      <EmptyState
        title="Restricted"
        description="Only organisation administrators and managers can open device operations and staff reliability tools. These routes match the API: super-admin without org scope will get 403 from tenant endpoints."
      />
    );
  }
  return <>{children}</>;
}

"use client";

import { canUseMoneyBook } from "@/lib/branch-access";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuthStore } from "@/stores/auth-store";

export default function MoneyBookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = useAuthStore((s) => s.user?.role);
  if (!canUseMoneyBook(role)) {
    return (
      <EmptyState
        title="Restricted"
        description="Only the business owner can open the Business Money Book."
      />
    );
  }
  return children;
}

"use client";

import { StaffAppGuide } from "@/components/staff-app/staff-app-guide";
import { useAuthStore } from "@/stores/auth-store";

export function StaffAppPageClient() {
  const org = useAuthStore((s) => s.organization);
  const orgId = org?.id ?? "";
  const orgName = org?.name ?? "your shop";

  return <StaffAppGuide orgId={orgId} orgName={orgName} />;
}

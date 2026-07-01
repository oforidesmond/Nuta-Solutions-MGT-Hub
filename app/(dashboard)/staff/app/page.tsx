import { StaffAppPageClient } from "@/app/(dashboard)/staff/app/staff-app-page-client";
import { isStaffAppDownloadConfigured } from "@/lib/staff-app";

export default function StaffAppPage() {
  return <StaffAppPageClient downloadAvailable={isStaffAppDownloadConfigured()} />;
}

import { endpoints } from "@/lib/api/endpoints";
import { platformGet } from "@/lib/api/platform/_pagination";
import type { PlatformDashboardData } from "@/lib/types/platform";

export async function fetchPlatformDashboard(): Promise<PlatformDashboardData> {
  return platformGet<PlatformDashboardData>(endpoints.platform.dashboard);
}

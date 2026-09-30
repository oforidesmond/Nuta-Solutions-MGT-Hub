"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchStaffAppUpdate,
  staffAppNestDownloadUrl,
  type StaffAppUpdateInfo,
} from "@/lib/staff-app";

export function useStaffAppUpdate() {
  const query = useQuery({
    queryKey: ["staff-app", "update"],
    queryFn: fetchStaffAppUpdate,
    staleTime: 60_000,
  });

  const update: StaffAppUpdateInfo | null = query.data ?? null;
  const downloadAvailable = Boolean(update);
  const downloadUrl = update?.downloadUrl?.trim() || staffAppNestDownloadUrl();

  return {
    update,
    downloadAvailable,
    downloadUrl,
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
}

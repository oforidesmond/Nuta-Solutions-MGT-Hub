"use client";

import { useAuthStore } from "@/stores/auth-store";

export function useActiveBranchId(): string | null {
  return useAuthStore((s) => s.activeBranchId);
}

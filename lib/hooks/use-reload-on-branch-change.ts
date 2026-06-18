"use client";

import { useEffect } from "react";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";

export function useReloadOnBranchChange(reload: () => void | Promise<void>) {
  const branchId = useActiveBranchId();
  useEffect(() => {
    void reload();
  }, [reload, branchId]);
}

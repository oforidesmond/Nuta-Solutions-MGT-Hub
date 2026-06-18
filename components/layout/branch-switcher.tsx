"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronDown, Loader2 } from "lucide-react";
import { fetchBranchesList } from "@/lib/api/branches";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth-store";
import { useBranchSwitcherStore } from "@/stores/branch-switcher-store";
import { isBranchScopedQueryKey } from "@/lib/query/branch-query-keys";
import { useStaffStore } from "@/stores/staff-store";
import { cn } from "@/lib/utils";

export function BranchSwitcher() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const setActiveBranch = useAuthStore((s) => s.setActiveBranch);
  const consumeOpenRequest = useBranchSwitcherStore((s) => s.consumeOpenRequest);
  const openRequested = useBranchSwitcherStore((s) => s.openRequested);
  const [open, setOpen] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!openRequested) return;
    consumeOpenRequest();
    setOpen(true);
  }, [openRequested, consumeOpenRequest]);

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranchesList,
    enabled: isAdmin,
    staleTime: 60_000,
  });

  const branches = useMemo(
    () => (branchesQuery.data ?? []).filter((b) => b.isActive !== false),
    [branchesQuery.data],
  );

  const activeBranch = useMemo(
    () => branches.find((b) => b.id === activeBranchId),
    [branches, activeBranchId],
  );

  if (!isAdmin) return null;

  const label = activeBranch?.name ?? "Branch";

  function handleSelect(branchId: string) {
    if (branchId === activeBranchId) return;
    setActiveBranch(branchId);
    void queryClient.invalidateQueries({
      predicate: (q) => isBranchScopedQueryKey(q.queryKey),
    });
    void useStaffStore.getState().loadPerformance();
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        disabled={branchesQuery.isPending}
        aria-label="Switch branch"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "max-w-[11rem] gap-1.5 truncate",
        )}
      >
        {branchesQuery.isPending ? (
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
        ) : (
          <Building2 className="size-4 shrink-0" aria-hidden />
        )}
        <span className="truncate">{label}</span>
        <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {branchesQuery.isError ? (
          <DropdownMenuItem disabled>Could not load branches</DropdownMenuItem>
        ) : branches.length === 0 ? (
          <DropdownMenuItem disabled>No branches</DropdownMenuItem>
        ) : (
          branches.map((branch) => (
            <DropdownMenuItem
              key={branch.id}
              onClick={() => handleSelect(branch.id)}
              className={cn(branch.id === activeBranchId && "bg-accent")}
            >
              <span className="truncate">{branch.name}</span>
              {branch.isDefault ? (
                <span className="ml-auto text-xs text-muted-foreground">Default</span>
              ) : null}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

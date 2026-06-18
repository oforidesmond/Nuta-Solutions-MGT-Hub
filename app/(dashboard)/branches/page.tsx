"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  Pencil,
  Plus,
  Power,
  PowerOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BranchFormModal } from "@/components/branches/branch-form-modal";
import { fetchBranches, updateBranch } from "@/lib/api/branches";
import { getApiErrorMessage, WHATSAPP_SUPPORT } from "@/lib/api/error-codes";
import { canCreateBranch, canManageBranches, canViewOrgAnalytics } from "@/lib/branch-access";
import { useAuthStore } from "@/stores/auth-store";
import type { HubBranch } from "@/lib/types/branches";
import { cn } from "@/lib/utils";

export default function BranchesPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = canCreateBranch(role);
  const canManage = canManageBranches(role);
  const showAnalytics = canViewOrgAnalytics(role);

  const branchesQuery = useQuery({
    queryKey: ["branches", "with-meta"],
    queryFn: fetchBranches,
    staleTime: 60_000,
  });

  const branches = branchesQuery.data?.branches ?? [];
  const meta = branchesQuery.data?.meta ?? null;

  const [createOpen, setCreateOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<HubBranch | null>(null);
  const [deactivateBranch, setDeactivateBranch] = useState<HubBranch | null>(null);

  const sortedBranches = useMemo(
    () =>
      [...branches].sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        if (a.isActive === false && b.isActive !== false) return 1;
        if (a.isActive !== false && b.isActive === false) return -1;
        return (a.name ?? "").localeCompare(b.name ?? "");
      }),
    [branches],
  );

  const isUnlimited = meta?.limit == null;
  const addDisabled = !isUnlimited && (meta?.remaining ?? 1) <= 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Branches</h1>
          <p className="text-sm text-muted-foreground">
            Manage the branches of your business and how stock and pricing work across them.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showAnalytics ? (
            <Link
              href="/branches/analytics"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              <BarChart3 className="size-4" aria-hidden />
              View org-wide analytics
            </Link>
          ) : null}
          {isAdmin ? <AddBranchButton disabled={addDisabled} onClick={() => setCreateOpen(true)} /> : null}
        </div>
      </div>

      <UsageSummary
        loading={branchesQuery.isPending}
        usedCount={meta?.used ?? branches.filter((b) => b.isActive !== false).length}
        limit={meta?.limit ?? null}
        remaining={meta?.remaining ?? null}
        isOverridden={meta?.isOverridden ?? false}
        planType={meta?.planType ?? null}
      />

      {branchesQuery.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : branchesQuery.isError ? (
        <EmptyState
          icon={<Building2 className="size-10" aria-hidden />}
          title="Could not load branches"
          description="Something went wrong loading your branches. Please try again."
          action={{ label: "Retry", onClick: () => void branchesQuery.refetch() }}
        />
      ) : sortedBranches.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-10" aria-hidden />}
          title="No branches yet"
          description={
            isAdmin
              ? "Create your first branch to start managing stock and pricing per location."
              : "No branches are available to view."
          }
          action={
            isAdmin ? { label: "Add branch", onClick: () => setCreateOpen(true) } : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedBranches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              canManage={canManage}
              onEdit={() => setEditBranch(branch)}
              onDeactivate={() => setDeactivateBranch(branch)}
            />
          ))}
        </div>
      )}

      {isAdmin ? (
        <BranchFormModal mode="create" open={createOpen} onOpenChange={setCreateOpen} />
      ) : null}
      {canManage ? (
        <BranchFormModal
          mode="edit"
          open={editBranch != null}
          onOpenChange={(open) => {
            if (!open) setEditBranch(null);
          }}
          branch={editBranch}
        />
      ) : null}
      {canManage ? (
        <DeactivateBranchDialog
          branch={deactivateBranch}
          onClose={() => setDeactivateBranch(null)}
        />
      ) : null}
    </div>
  );
}

function AddBranchButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  if (!disabled) {
    return (
      <Button type="button" size="lg" onClick={onClick}>
        <Plus className="size-4" aria-hidden />
        Add branch
      </Button>
    );
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex">
            <Button type="button" size="lg" disabled>
              <Plus className="size-4" aria-hidden />
              Add branch
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          You&apos;ve reached your plan&apos;s branch limit. Upgrade your plan to add more branches.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function UsageSummary({
  loading,
  usedCount,
  limit,
  remaining,
  isOverridden,
  planType,
}: {
  loading: boolean;
  usedCount: number;
  limit: number | null;
  remaining: number | null;
  isOverridden: boolean;
  planType: string | null;
}) {
  if (loading) {
    return <Skeleton className="h-20 w-full rounded-xl" />;
  }
  const unlimited = limit == null;
  const usageLabel = unlimited
    ? `${usedCount} ${usedCount === 1 ? "branch" : "branches"} active`
    : `${usedCount} of ${limit} ${limit === 1 ? "branch" : "branches"} used`;
  const atLimit = !unlimited && (remaining ?? 0) <= 0;

  return (
    <Card className="border-border/40 bg-card/80">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="size-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{usageLabel}</p>
            <p className="text-xs text-muted-foreground">
              {unlimited
                ? "Your plan allows unlimited branches."
                : atLimit
                  ? "Upgrade your plan to add more branches."
                  : `${remaining} ${remaining === 1 ? "slot" : "slots"} remaining.`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {planType ? <Badge variant="secondary">{formatPlan(planType)}</Badge> : null}
          {isOverridden ? (
            <Badge variant="outline" title="A custom branch limit is in effect for your organisation">
              Custom limit
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function BranchCard({
  branch,
  canManage,
  onEdit,
  onDeactivate,
}: {
  branch: HubBranch;
  canManage: boolean;
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  const queryClient = useQueryClient();
  const isActive = branch.isActive !== false;
  const isDefault = branch.isDefault === true;

  const reactivate = useMutation({
    mutationFn: () => updateBranch(branch.id, { isActive: true }),
    onSuccess: () => {
      toast.success("Branch reactivated");
      void queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <Card className={cn("border-border/40", !isActive && "opacity-75")}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="truncate">{branch.name}</CardTitle>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {isDefault ? <Badge variant="secondary">Default</Badge> : null}
            <Badge variant={isActive ? "outline" : "destructive"}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {branch.location?.trim() ? branch.location : "No location set"}
        </p>
        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="size-3.5" aria-hidden />
              Edit
            </Button>
            {isActive ? (
              <DeactivateControl isDefault={isDefault} onDeactivate={onDeactivate} />
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => reactivate.mutate()}
                disabled={reactivate.isPending}
              >
                <Power className="size-3.5" aria-hidden />
                {reactivate.isPending ? "Reactivating…" : "Reactivate"}
              </Button>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DeactivateControl({
  isDefault,
  onDeactivate,
}: {
  isDefault: boolean;
  onDeactivate: () => void;
}) {
  if (!isDefault) {
    return (
      <Button type="button" variant="destructive" size="sm" onClick={onDeactivate}>
        <PowerOff className="size-3.5" aria-hidden />
        Deactivate
      </Button>
    );
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex">
            <Button type="button" variant="destructive" size="sm" disabled>
              <PowerOff className="size-3.5" aria-hidden />
              Deactivate
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          The default branch can&apos;t be deactivated. Assign another branch as default first —
          contact support on WhatsApp {WHATSAPP_SUPPORT} to reassign.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function DeactivateBranchDialog({
  branch,
  onClose,
}: {
  branch: HubBranch | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => {
      if (!branch) throw new Error("No branch");
      return updateBranch(branch.id, { isActive: false });
    },
    onSuccess: () => {
      toast.success("Branch deactivated");
      void queryClient.invalidateQueries({ queryKey: ["branches"] });
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err));
      onClose();
    },
  });

  return (
    <Dialog open={branch != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deactivate {branch?.name}?</DialogTitle>
          <DialogDescription>
            This branch will stop appearing in the branch switcher and its stock will be frozen.
            You can reactivate it at any time.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Deactivating…" : "Deactivate branch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatPlan(plan: string): string {
  if (!plan) return plan;
  return plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
}

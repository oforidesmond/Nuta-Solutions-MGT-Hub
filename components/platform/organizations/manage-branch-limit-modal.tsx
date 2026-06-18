"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlanBadge } from "@/components/platform/plan-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchOrganizationDetails,
  updateOrganizationBranchLimit,
} from "@/lib/api/platform/organizations";
import { handleApiError } from "@/lib/api/errors";
import {
  PLATFORM_UNLIMITED_BRANCH_LIMIT,
  branchLimitModeFromOverride,
  formatEffectiveBranchLimit,
  formatBranchUsage,
  hasBranchLimitOverride,
  isBranchUsageOverLimit,
  isUnlimitedBranchOverride,
  planDefaultBranchLimit,
  type BranchLimitMode,
} from "@/lib/platform-branch-limits";
import type {
  PlanType,
  PlatformOrgPlanSummary,
  UpdateOrganizationBranchLimitDto,
} from "@/lib/types/platform";

interface ManageBranchLimitModalProps {
  orgId: string;
  orgName: string;
  planType: PlanType;
  /** When omitted, details are fetched when the modal opens. */
  plan?: PlatformOrgPlanSummary | null;
  /** Active branch count; hydrated from org detail when omitted. */
  branchCount?: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageBranchLimitModal({
  orgId,
  orgName,
  planType,
  plan: planProp,
  branchCount: branchCountProp,
  open,
  onOpenChange,
}: ManageBranchLimitModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <ManageBranchLimitForm
          key={`${orgId}-${String(open)}`}
          orgId={orgId}
          orgName={orgName}
          planType={planType}
          planProp={planProp}
          branchCountProp={branchCountProp}
          open={open}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ManageBranchLimitForm({
  orgId,
  orgName,
  planType,
  planProp,
  branchCountProp,
  open,
  onClose,
}: {
  orgId: string;
  orgName: string;
  planType: PlanType;
  planProp?: PlatformOrgPlanSummary | null;
  branchCountProp?: number | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const needsFetch = open && !planProp;

  const detailsQuery = useQuery({
    queryKey: ["platform", "organizations", orgId],
    queryFn: () => fetchOrganizationDetails(orgId),
    enabled: needsFetch,
  });

  const plan = planProp ?? detailsQuery.data?.plan ?? null;
  const branchCount =
    branchCountProp ?? detailsQuery.data?.organization.branchCount ?? null;
  const branchLimitOverride = plan?.branchLimitOverride ?? null;
  const effectiveBranchLimit = plan?.effectiveBranchLimit ?? null;
  const resolvedPlanType = plan?.type ?? planType;

  const [mode, setMode] = useState<BranchLimitMode>(() =>
    branchLimitModeFromOverride(branchLimitOverride),
  );
  const [customLimit, setCustomLimit] = useState<string>(
    branchLimitOverride != null && !isUnlimitedBranchOverride(branchLimitOverride)
      ? String(branchLimitOverride)
      : "",
  );
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!plan) return;
    setMode(branchLimitModeFromOverride(plan.branchLimitOverride));
    setCustomLimit(
      plan.branchLimitOverride != null &&
        !isUnlimitedBranchOverride(plan.branchLimitOverride)
        ? String(plan.branchLimitOverride)
        : "",
    );
    setReason("");
  }, [plan, open]);

  const mutation = useMutation({
    mutationFn: (dto: UpdateOrganizationBranchLimitDto) =>
      updateOrganizationBranchLimit(orgId, dto),
    onSuccess: () => {
      toast.success("Branch limit updated.");
      queryClient.invalidateQueries({ queryKey: ["platform"] });
      onClose();
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  const customNum = Number(customLimit);
  const customValid =
    mode !== "custom" ||
    (Number.isInteger(customNum) &&
      customNum >= 1 &&
      customNum <= PLATFORM_UNLIMITED_BRANCH_LIMIT - 1);

  const planReady =
    plan != null && (!needsFetch || detailsQuery.isSuccess);
  const canSubmit = !mutation.isPending && customValid && planReady;

  const resolvedEffectiveLimit =
    effectiveBranchLimit ?? planDefaultBranchLimit(resolvedPlanType);
  const usageOverLimit =
    branchCount != null &&
    isBranchUsageOverLimit(branchCount, resolvedEffectiveLimit);

  function handleSubmit() {
    if (!canSubmit) return;
    let limit: number | null;
    if (mode === "plan-default") {
      limit = null;
    } else if (mode === "unlimited") {
      limit = PLATFORM_UNLIMITED_BRANCH_LIMIT;
    } else {
      limit = customNum;
    }
    const dto: UpdateOrganizationBranchLimitDto = {
      limit,
      reason: reason.trim() || undefined,
    };
    mutation.mutate(dto);
  }

  if (needsFetch && detailsQuery.isPending) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Manage branch limit - {orgName}</DialogTitle>
          <DialogDescription>Loading organization plan…</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </>
    );
  }

  if (needsFetch && detailsQuery.isError) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Manage branch limit - {orgName}</DialogTitle>
          <DialogDescription className="text-destructive">
            {handleApiError(detailsQuery.error)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </>
    );
  }

  const planDefault = planDefaultBranchLimit(resolvedPlanType);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Manage branch limit - {orgName}</DialogTitle>
        <DialogDescription>
          Override how many active branches this organization may have. Changes
          are recorded in the platform audit log.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-sm">
          <p className="text-xs text-muted-foreground">Current limit</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <PlanBadge plan={resolvedPlanType} />
            <span className="text-foreground">
              {formatEffectiveBranchLimit(resolvedEffectiveLimit)}
            </span>
            {hasBranchLimitOverride(branchLimitOverride) ? (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.65rem] font-medium text-amber-700 dark:text-amber-400">
                Custom override
              </span>
            ) : null}
          </div>
          {branchCount != null ? (
            <p
              className={
                usageOverLimit
                  ? "mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-400"
                  : "mt-1.5 text-xs text-muted-foreground"
              }
            >
              {formatBranchUsage(branchCount, resolvedEffectiveLimit)}
              {usageOverLimit ? " — over current limit" : null}
            </p>
          ) : null}
          <p className="mt-1.5 text-xs text-muted-foreground">
            Plan default: {formatEffectiveBranchLimit(planDefault)}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Branch limit</Label>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="branch-limit-mode"
                checked={mode === "plan-default"}
                onChange={() => setMode("plan-default")}
                className="size-4"
              />
              <span>
                Use plan default (
                {formatEffectiveBranchLimit(planDefault)})
              </span>
            </label>
            <label className="flex flex-wrap items-center gap-2">
              <input
                type="radio"
                name="branch-limit-mode"
                checked={mode === "custom"}
                onChange={() => setMode("custom")}
                className="size-4"
              />
              <span>Custom cap</span>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={PLATFORM_UNLIMITED_BRANCH_LIMIT - 1}
                value={customLimit}
                onChange={(e) => setCustomLimit(e.target.value)}
                disabled={mode !== "custom"}
                className="ml-1 h-8 max-w-[8rem]"
                placeholder="e.g. 10"
              />
              <span className="text-muted-foreground">branches allowed</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="branch-limit-mode"
                checked={mode === "unlimited"}
                onChange={() => setMode("unlimited")}
                className="size-4"
              />
              <span>Unlimited branches</span>
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="branch-limit-reason">Reason (optional)</Label>
          <Textarea
            id="branch-limit-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. Enterprise pilot — temporary branch expansion"
          />
          <p className="text-right text-[0.7rem] text-muted-foreground">
            {reason.length} / 500
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
          {mutation.isPending ? "Saving…" : "Update branch limit"}
        </Button>
      </DialogFooter>
    </>
  );
}

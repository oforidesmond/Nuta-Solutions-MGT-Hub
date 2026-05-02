"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { updateOrganizationPlan } from "@/lib/api/platform/organizations";
import { handleApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type {
  PlanType,
  PlatformOrganization,
  UpdateOrganizationPlanDto,
} from "@/lib/types/platform";

const PLAN_OPTIONS: { value: PlanType; label: string; description: string }[] = [
  { value: "FREE", label: "Free", description: "Limited usage, no card on file." },
  { value: "TRIAL", label: "Trial", description: "Time-limited PRO access." },
  { value: "PRO", label: "Pro", description: "Standard paid tier." },
  { value: "ENTERPRISE", label: "Enterprise", description: "Custom limits and SLAs." },
];

interface ManagePlanModalProps {
  org: PlatformOrganization;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManagePlanModal({ org, open, onOpenChange }: ManagePlanModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <ManagePlanForm
          key={String(open)}
          org={org}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ManagePlanForm({
  org,
  onClose,
}: {
  org: PlatformOrganization;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [planType, setPlanType] = useState<PlanType>(org.planType);
  const [unlimited, setUnlimited] = useState(org.salesLimit == null);
  const [salesLimit, setSalesLimit] = useState<string>(
    org.salesLimit != null ? String(org.salesLimit) : "",
  );
  const [trialEndDate, setTrialEndDate] = useState<string>(
    toDateInput(org.trialEndDate),
  );
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: (dto: UpdateOrganizationPlanDto) =>
      updateOrganizationPlan(org.id, dto),
    onSuccess: () => {
      toast.success("Plan updated.");
      queryClient.invalidateQueries({ queryKey: ["platform"] });
      onClose();
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  const trimmedReason = reason.trim();
  const canSubmit =
    trimmedReason.length > 0 &&
    !mutation.isPending &&
    (unlimited || Number.isFinite(Number(salesLimit)));

  function handleSubmit() {
    if (!canSubmit) return;
    const dto: UpdateOrganizationPlanDto = {
      planType,
      salesLimit: unlimited ? null : Number(salesLimit),
      trialEndDate:
        planType === "TRIAL" && trialEndDate
          ? new Date(trialEndDate).toISOString()
          : null,
      reason: trimmedReason,
    };
    mutation.mutate(dto);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Manage plan — {org.name}</DialogTitle>
        <DialogDescription>
          Changes apply immediately and are recorded in the platform audit log.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-sm">
          <p className="text-xs text-muted-foreground">Current plan</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <PlanBadge plan={org.planType} />
            <span className="tabular-nums text-foreground">
              {org.salesCount.toLocaleString()} /{" "}
              {org.salesLimit ? org.salesLimit.toLocaleString() : "∞"} sales
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Plan type</Label>
          <div className="grid grid-cols-2 gap-2">
            {PLAN_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPlanType(opt.value)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  planType === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:border-border",
                )}
                aria-pressed={planType === opt.value}
              >
                <p className="text-sm font-medium text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Sales limit</Label>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="sales-limit-mode"
                checked={unlimited}
                onChange={() => setUnlimited(true)}
                className="size-4"
              />
              <span>Unlimited sales</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="sales-limit-mode"
                checked={!unlimited}
                onChange={() => setUnlimited(false)}
                className="size-4"
              />
              <span>Set a limit</span>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={salesLimit}
                onChange={(e) => setSalesLimit(e.target.value)}
                disabled={unlimited}
                className="ml-1 h-8 max-w-[8rem]"
                placeholder="e.g. 1000"
              />
            </label>
          </div>
        </div>

        {planType === "TRIAL" ? (
          <div className="space-y-1.5">
            <Label htmlFor="trial-end">Trial end date</Label>
            <Input
              id="trial-end"
              type="date"
              value={trialEndDate}
              onChange={(e) => setTrialEndDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leaving this empty clears the trial date.
            </p>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="manage-plan-reason">
            Reason for change <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="manage-plan-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. Customer upgraded to Pro after sales call"
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
          {mutation.isPending ? "Saving…" : "Update plan"}
        </Button>
      </DialogFooter>
    </>
  );
}

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

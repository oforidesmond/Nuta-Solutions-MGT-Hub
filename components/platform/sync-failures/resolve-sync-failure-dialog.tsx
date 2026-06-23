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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { handleApiError } from "@/lib/api/errors";
import { resolvePlatformSyncFailure } from "@/lib/api/platform/sync-failures";
import type {
  JsonObject,
  PlatformSyncFailureDetail,
  PlatformSyncFailureResolutionAction,
} from "@/lib/types/platform";
import { asJsonObject, discountResolutionHint, isDiscountSyncError, safePrettyJson } from "@/components/platform/sync-failures/presentation";

interface ResolveSyncFailureDialogProps {
  failure: PlatformSyncFailureDetail;
  action: PlatformSyncFailureResolutionAction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved: (next: PlatformSyncFailureDetail) => void;
}

export function ResolveSyncFailureDialog({
  failure,
  action,
  open,
  onOpenChange,
  onResolved,
}: ResolveSyncFailureDialogProps) {
  const queryClient = useQueryClient();
  const initialPayloadText = safePrettyJson(asJsonObject(failure.requestPayload) ?? {});
  const [notes, setNotes] = useState("");
  const [payloadText, setPayloadText] = useState(initialPayloadText);
  const [payloadError, setPayloadError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const body: {
        action: PlatformSyncFailureResolutionAction;
        notes?: string;
        patchedPayload?: JsonObject;
      } = {
        action,
        notes: notes.trim() || undefined,
      };

      if (action === "FIX_AND_APPLY") {
        const parsed = parsePatchedPayload(payloadText);
        body.patchedPayload = parsed;
      }

      return resolvePlatformSyncFailure(failure.id, body);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(
        ["platform", "sync-failures", "detail", failure.id],
        updated,
      );
      queryClient.invalidateQueries({ queryKey: ["platform", "sync-failures"] });
      onResolved(updated);
      toast.success(successMessage(action));
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });

  function onSubmit() {
    if (action === "FIX_AND_APPLY") {
      try {
        parsePatchedPayload(payloadText);
        setPayloadError(null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Patched payload must be valid JSON.";
        setPayloadError(message);
        toast.error(message);
        return;
      }
    }
    mutation.mutate();
  }

  const canSubmit =
    !mutation.isPending &&
    (action !== "FIX_AND_APPLY" || payloadText.trim().length > 0);

  const discountFailure = isDiscountSyncError(failure.errorCode);
  const resolutionHint = discountFailure ? discountResolutionHint(action) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={action === "FIX_AND_APPLY" ? "sm:max-w-3xl" : "sm:max-w-lg"}>
        <DialogHeader>
          <DialogTitle>{dialogTitle(action)}</DialogTitle>
          <DialogDescription>{dialogDescription(action)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-sm">
            <p className="font-medium text-foreground">Failure ID</p>
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{failure.id}</p>
            <p className="mt-3 font-medium text-foreground">Entity ID</p>
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
              {failure.entityId}
            </p>
          </div>

          {action === "FIX_AND_APPLY" ? (
            <div className="space-y-1.5">
              {discountFailure ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Discount failure repair</p>
                  <p className="mt-1">
                    Correct <span className="font-mono">discountAmount</span> and{" "}
                    <span className="font-mono">totalAmount</span> in the payload below.
                    Discount cap validation is skipped on trusted apply.
                  </p>
                  {resolutionHint ? <p className="mt-2">{resolutionHint}</p> : null}
                </div>
              ) : null}
              <Label htmlFor="sync-failure-payload">
                Patched payload <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="sync-failure-payload"
                value={payloadText}
                onChange={(event) => {
                  setPayloadText(event.target.value);
                  if (payloadError) setPayloadError(null);
                }}
                rows={18}
                className="font-mono text-xs"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Start from the original failed payload, correct fields, then submit as
                `patchedPayload`.
              </p>
              {payloadError ? (
                <p className="text-xs text-destructive">{payloadError}</p>
              ) : null}
            </div>
          ) : null}

          {discountFailure && action !== "FIX_AND_APPLY" && resolutionHint ? (
            <p className="text-xs text-muted-foreground">{resolutionHint}</p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="sync-failure-notes">Notes</Label>
            <Textarea
              id="sync-failure-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Optional operator notes for auditability"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={!canSubmit}>
            {mutation.isPending ? pendingLabel(action) : confirmLabel(action)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function parsePatchedPayload(payloadText: string): JsonObject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadText);
  } catch {
    throw new Error("Patched payload must be valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Patched payload must be a JSON object.");
  }

  return parsed as JsonObject;
}

function dialogTitle(action: PlatformSyncFailureResolutionAction): string {
  switch (action) {
    case "RETRY":
      return "Resolve for retry";
    case "IGNORE_CLEAR":
      return "Ignore and clear";
    case "FIX_AND_APPLY":
      return "Fix and apply sale";
    default:
      return "Resolve sync failure";
  }
}

function dialogDescription(action: PlatformSyncFailureResolutionAction): string {
  switch (action) {
    case "RETRY":
      return "Marks the failure resolved for retry so the staff device can retry the original payload later.";
    case "IGNORE_CLEAR":
      return "Archives the failure so the staff device can clear the failed local queue row.";
    case "FIX_AND_APPLY":
      return "Submit a corrected payload. The backend will validate and apply the sale immediately if the payload is valid.";
    default:
      return "Resolve this sync failure.";
  }
}

function confirmLabel(action: PlatformSyncFailureResolutionAction): string {
  switch (action) {
    case "RETRY":
      return "Mark for retry";
    case "IGNORE_CLEAR":
      return "Ignore and clear";
    case "FIX_AND_APPLY":
      return "Fix and apply";
    default:
      return "Confirm";
  }
}

function pendingLabel(action: PlatformSyncFailureResolutionAction): string {
  switch (action) {
    case "RETRY":
      return "Resolving…";
    case "IGNORE_CLEAR":
      return "Archiving…";
    case "FIX_AND_APPLY":
      return "Applying…";
    default:
      return "Saving…";
  }
}

function successMessage(action: PlatformSyncFailureResolutionAction): string {
  switch (action) {
    case "RETRY":
      return "Failure marked for retry.";
    case "IGNORE_CLEAR":
      return "Failure archived.";
    case "FIX_AND_APPLY":
      return "Patched sale applied.";
    default:
      return "Failure resolved.";
  }
}

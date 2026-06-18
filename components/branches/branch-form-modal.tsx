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
import { createBranch, updateBranch } from "@/lib/api/branches";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api/error-codes";
import type { HubBranch } from "@/lib/types/branches";

type Mode = "create" | "edit";

interface BranchFormModalProps {
  mode: Mode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Branch to edit (required for edit mode). */
  branch?: HubBranch | null;
}

export function BranchFormModal({ mode, open, onOpenChange, branch }: BranchFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <BranchForm
          key={`${mode}-${branch?.id ?? "new"}-${String(open)}`}
          mode={mode}
          branch={branch}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function BranchForm({
  mode,
  branch,
  onClose,
}: {
  mode: Mode;
  branch?: HubBranch | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(branch?.name ?? "");
  const [location, setLocation] = useState(branch?.location ?? "");
  /** Inline message for name conflicts so the user can correct without losing context. */
  const [nameError, setNameError] = useState<string | null>(null);
  /** Blocking org-state error (broken default branches). */
  const [blockingError, setBlockingError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      const trimmedLocation = location.trim();
      if (mode === "create") {
        return createBranch({
          name: trimmedName,
          location: trimmedLocation || undefined,
        });
      }
      if (!branch) throw new Error("No branch to update");
      return updateBranch(branch.id, {
        name: trimmedName,
        location: trimmedLocation || undefined,
      });
    },
    onSuccess: () => {
      toast.success(mode === "create" ? "Branch created" : "Branch updated");
      void queryClient.invalidateQueries({ queryKey: ["branches"] });
      onClose();
    },
    onError: (err) => {
      const code = getApiErrorCode(err);
      const message = getApiErrorMessage(err);
      if (code === "BRANCH_NAME_CONFLICT") {
        setNameError(message);
        return;
      }
      if (
        code === "NO_DEFAULT_BRANCH" ||
        code === "MULTIPLE_DEFAULT_BRANCHES"
      ) {
        setBlockingError(message);
        return;
      }
      // BRANCH_LIMIT_REACHED and anything else: toast the friendly message.
      toast.error(message);
    },
  });

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && !mutation.isPending;

  function handleSubmit() {
    if (!canSubmit) return;
    setNameError(null);
    setBlockingError(null);
    mutation.mutate();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "create" ? "Add branch" : "Edit branch"}</DialogTitle>
        <DialogDescription>
          {mode === "create"
            ? "Create a new branch of your business. It starts with zero stock across your catalogue."
            : "Update this branch's name or location."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="branch-name">
            Branch name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="branch-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="e.g. Main outlet"
            aria-invalid={nameError ? true : undefined}
            autoFocus
            maxLength={120}
          />
          {nameError ? (
            <p className="text-xs text-destructive">{nameError}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="branch-location">Location</Label>
          <Input
            id="branch-location"
            value={location ?? ""}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Optional (e.g. Accra, East Legon)"
            maxLength={200}
          />
        </div>

        {blockingError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {blockingError}
          </div>
        ) : null}
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
          {mutation.isPending
            ? "Saving…"
            : mode === "create"
              ? "Create branch"
              : "Save changes"}
        </Button>
      </DialogFooter>
    </>
  );
}

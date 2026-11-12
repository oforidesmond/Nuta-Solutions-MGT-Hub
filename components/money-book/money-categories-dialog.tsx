"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import {
  createMoneyCategory,
  fetchMoneyCategories,
  updateMoneyCategory,
} from "@/lib/api/money-book";
import { handleApiError } from "@/lib/api/errors";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { moneyBookKeys } from "@/lib/query/money-book-keys";
import type { MoneyEntryDirection } from "@/lib/types/money-book";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MoneyCategoriesDialog({ open, onOpenChange }: Props) {
  const [direction, setDirection] = useState<MoneyEntryDirection>("OUT");
  const [newName, setNewName] = useState("");
  const activeBranchId = useActiveBranchId();
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: moneyBookKeys.categories(activeBranchId, `${direction}-manage`),
    queryFn: () =>
      fetchMoneyCategories({ direction, includeInactive: true }),
    enabled: open,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["branch", activeBranchId ?? "none", "money-book", "categories"],
    });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createMoneyCategory({ direction, name: newName.trim() }),
    onSuccess: () => {
      setNewName("");
      invalidate();
      toast.success("Added to what-for list.");
    },
    onError: (e) => toast.error(handleApiError(e).message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateMoneyCategory(id, { isActive }),
    onSuccess: () => {
      invalidate();
      toast.success("Updated.");
    },
    onError: (e) => toast.error(handleApiError(e).message),
  });

  const rows = categoriesQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/40 bg-card/95 backdrop-blur-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage what-for list</DialogTitle>
          <DialogDescription>
            Add or hide labels used when recording Money In or Money Out.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          {(["OUT", "IN"] as MoneyEntryDirection[]).map((d) => (
            <Button
              key={d}
              type="button"
              size="sm"
              variant={direction === d ? "default" : "outline"}
              className="min-h-10 flex-1"
              onClick={() => setDirection(d)}
            >
              {d === "OUT" ? "Money Out" : "Money In"}
            </Button>
          ))}
        </div>

        <div className="max-h-56 space-y-2 overflow-y-auto">
          {categoriesQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No labels yet.</p>
          ) : (
            rows.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2.5",
                  !c.isActive && "opacity-60",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.isSystem ? "Default" : "Custom"}
                    {!c.isActive ? " · Hidden" : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={toggleMutation.isPending}
                  onClick={() =>
                    toggleMutation.mutate({ id: c.id, isActive: !c.isActive })
                  }
                >
                  {c.isActive ? "Hide" : "Show"}
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2 border-t border-border/40 pt-3">
          <Label htmlFor="new-cat">Add new label</Label>
          <div className="flex gap-2">
            <Input
              id="new-cat"
              className="h-11"
              placeholder={
                direction === "OUT" ? "e.g. Shop painting" : "e.g. Family help"
              }
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button
              type="button"
              className="min-h-11 shrink-0"
              disabled={!newName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
          </div>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

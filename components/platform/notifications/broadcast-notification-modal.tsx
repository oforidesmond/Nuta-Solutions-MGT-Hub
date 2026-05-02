"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import {
  MultiSelectDropdown,
  type MultiSelectOption,
} from "@/components/platform/multi-select-dropdown";
import { fetchOrganizationsPage } from "@/lib/api/platform/organizations";
import { broadcastPlatformNotification } from "@/lib/api/platform/notifications";
import { handleApiError } from "@/lib/api/errors";
import type { UserRole } from "@/lib/types/domain";
import type { PlatformNotificationType } from "@/lib/types/platform";

const ROLE_OPTIONS: MultiSelectOption<UserRole>[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "STAFF", label: "Staff" },
  { value: "SALES_AGENT", label: "Sales agent" },
];

interface BroadcastNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BroadcastNotificationModal({ open, onOpenChange }: BroadcastNotificationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <BroadcastForm key={String(open)} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function BroadcastForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<PlatformNotificationType>("SYSTEM_ALERT");
  const [allOrgs, setAllOrgs] = useState(true);
  const [targetOrgIds, setTargetOrgIds] = useState<string[]>([]);
  const [targetRoles, setTargetRoles] = useState<UserRole[]>([]);
  const [orgSearch, setOrgSearch] = useState("");
  const [debouncedOrgSearch, setDebouncedOrgSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedOrgSearch(orgSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [orgSearch]);

  const orgSearchQuery = useQuery({
    queryKey: ["platform", "organizations", "broadcast-pick", debouncedOrgSearch],
    queryFn: () =>
      fetchOrganizationsPage({
        search: debouncedOrgSearch || undefined,
        page: 1,
        limit: 12,
      }),
    enabled: pickerOpen && !allOrgs && debouncedOrgSearch.length > 0,
    placeholderData: keepPreviousData,
  });

  const mutation = useMutation({
    mutationFn: () =>
      broadcastPlatformNotification({
        title: title.trim(),
        message: message.trim(),
        type,
        ...(allOrgs
          ? {}
          : targetOrgIds.length > 0
            ? { targetOrganizations: targetOrgIds }
            : {}),
        ...(targetRoles.length > 0 ? { targetRoles } : {}),
      }),
    onSuccess: (res) => {
      toast.success(`Sent ${res.notificationsSent} notifications to ${res.recipientCount} recipients.`);
      queryClient.invalidateQueries({ queryKey: ["platform"] });
      onClose();
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  const canSubmit =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    !mutation.isPending &&
    (allOrgs || targetOrgIds.length > 0);

  function addOrg(id: string) {
    if (!targetOrgIds.includes(id)) setTargetOrgIds((prev) => [...prev, id]);
    setOrgSearch("");
    setDebouncedOrgSearch("");
    setPickerOpen(false);
  }

  function removeOrg(id: string) {
    setTargetOrgIds((prev) => prev.filter((x) => x !== id));
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Broadcast announcement</DialogTitle>
        <DialogDescription>
          Fans out tenant notifications optionally scoped by organization and roles. Omitting targets reaches every active tenant.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="bc-title">Title</Label>
          <Input id="bc-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bc-msg">Message</Label>
          <Textarea id="bc-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={2000} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bc-type">Type</Label>
          <select
            id="bc-type"
            value={type}
            onChange={(e) => setType(e.target.value as PlatformNotificationType)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="SYSTEM_ALERT">System alert</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="ERROR">Error</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allOrgs}
            onChange={(e) => {
              setAllOrgs(e.target.checked);
              if (e.target.checked) setTargetOrgIds([]);
            }}
            className="size-4 rounded"
          />
          <span>Send to all active organizations</span>
        </label>

        {!allOrgs ? (
          <div className="space-y-2">
            <Label>Target organizations</Label>
            <div className="flex flex-wrap gap-2">
              {targetOrgIds.map((id) => (
                <Badge key={id} variant="secondary" className="gap-1 font-mono text-[0.65rem]">
                  {id.slice(0, 8)}…
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-muted"
                    onClick={() => removeOrg(id)}
                    aria-label={`Remove ${id}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search orgs to add…"
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                onFocus={() => setPickerOpen(true)}
                onBlur={() => window.setTimeout(() => setPickerOpen(false), 150)}
                className="pl-9"
              />
              {pickerOpen && debouncedOrgSearch && orgSearchQuery.data?.data?.length ? (
                <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-auto rounded-lg border bg-card py-1 text-sm shadow-md">
                  {orgSearchQuery.data.data
                    .filter((o) => !targetOrgIds.includes(o.id))
                    .map((o) => (
                      <li key={o.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected="false"
                          className="flex w-full flex-col px-3 py-2 text-left hover:bg-muted/60"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => addOrg(o.id)}
                        >
                          <span className="font-medium">{o.name}</span>
                          <span className="text-xs text-muted-foreground">{o.email ?? o.id}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Pick at least one organization, or switch back to “all active organizations”.
            </p>
          </div>
        ) : null}

        <div className="space-y-1">
          <MultiSelectDropdown<UserRole>
            label="Target roles"
            emptyLabel="Org-wide broadcast"
            options={ROLE_OPTIONS}
            selected={targetRoles}
            onChange={setTargetRoles}
          />
          <p className="text-xs text-muted-foreground">
            Empty roles → one notification per organization with userId omitted (tenant admins).
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="button" onClick={() => mutation.mutate()} disabled={!canSubmit}>
          {mutation.isPending ? "Sending…" : "Send broadcast"}
        </Button>
      </DialogFooter>
    </>
  );
}

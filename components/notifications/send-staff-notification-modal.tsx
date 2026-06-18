"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
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
import {
  MultiSelectDropdown,
  type MultiSelectOption,
} from "@/components/platform/multi-select-dropdown";
import { fetchOrgUsers } from "@/lib/api/users";
import { sendStaffNotification } from "@/lib/api/notifications";
import { handleApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type { HubUser } from "@/lib/types/domain";
import {
  HUB_MANUAL_NOTIFICATION_TYPE_OPTIONS,
  type HubManualNotificationType,
  type SendNotificationDto,
  type StaffNotificationTargetRole,
} from "@/lib/types/phase2";

type TargetingMode = "allStaff" | "byRole" | "byUser";

interface SelectedUser {
  id: string;
  label: string;
}

const STAFF_ROLE_OPTIONS: MultiSelectOption<StaffNotificationTargetRole>[] = [
  { value: "STAFF", label: "Staff" },
  { value: "SALES_AGENT", label: "Sales agent" },
];

const RECIPIENT_ROLES = new Set<string>(["STAFF", "SALES_AGENT"]);

interface SendStaffNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendStaffNotificationModal({ open, onOpenChange }: SendStaffNotificationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <SendStaffNotificationForm key={String(open)} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

/**
 * POST /notifications/send - tenant owner/manager → staff (see NOTIFICATIONS_REALTIME §4.3).
 * Targeting priority: targetUserIds > targetRoles > targetAllStaff.
 */
function buildSendPayload(input: {
  mode: TargetingMode;
  title: string;
  message: string;
  type: HubManualNotificationType;
  targetRoles: StaffNotificationTargetRole[];
  selectedUsers: SelectedUser[];
}): SendNotificationDto {
  const base = {
    title: input.title,
    message: input.message,
    type: input.type,
  };
  const userIds = [...new Set(input.selectedUsers.map((u) => u.id))];

  if (input.mode === "byUser" && userIds.length > 0) {
    return { ...base, targetUserIds: userIds };
  }
  if (input.mode === "byRole" && input.targetRoles.length > 0) {
    return { ...base, targetRoles: input.targetRoles };
  }
  return { ...base, targetAllStaff: true };
}

function formatSendError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; invalidUserIds?: string[] } | undefined;
    const base = handleApiError(err);
    const invalid = data?.invalidUserIds;
    if (invalid?.length) {
      return `${base} Invalid IDs: ${invalid.join(", ")}`;
    }
    return base;
  }
  return handleApiError(err);
}

function userLabel(u: HubUser): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  return u.email ?? u.id;
}

function isEligibleRecipient(u: HubUser): boolean {
  if (!RECIPIENT_ROLES.has(String(u.role))) return false;
  const active = (u as HubUser & { isActive?: boolean }).isActive;
  return active !== false;
}

function SendStaffNotificationForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<TargetingMode>("allStaff");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<HubManualNotificationType>("OWNER_MESSAGE");
  const [targetRoles, setTargetRoles] = useState<StaffNotificationTargetRole[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [userSearch, setUserSearch] = useState("");

  const usersQuery = useQuery({
    queryKey: ["org", "users", "staff-notification-pick"],
    queryFn: fetchOrgUsers,
    enabled: mode === "byUser",
  });

  const eligibleStaff = useMemo(() => {
    const list = usersQuery.data ?? [];
    return list.filter(isEligibleRecipient);
  }, [usersQuery.data]);

  const filteredStaff = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return eligibleStaff;
    return eligibleStaff.filter((u) => {
      const label = userLabel(u).toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      return label.includes(q) || email.includes(q);
    });
  }, [eligibleStaff, userSearch]);

  const mutation = useMutation({
    mutationFn: () =>
      sendStaffNotification(
        buildSendPayload({
          mode,
          title: title.trim(),
          message: message.trim(),
          type,
          targetRoles,
          selectedUsers,
        }),
      ),
    onSuccess: (res) => {
      toast.success(`Notification sent to ${res.sent} recipient${res.sent === 1 ? "" : "s"}.`);
      void queryClient.invalidateQueries({ queryKey: ["notifications", "sent"] });
      onClose();
    },
    onError: (err) => toast.error(formatSendError(err)),
  });

  const hasTargeting =
    mode === "allStaff" ||
    (mode === "byRole" && targetRoles.length > 0) ||
    (mode === "byUser" && selectedUsers.length > 0);

  const canSubmit =
    title.trim().length > 0 && message.trim().length > 0 && hasTargeting && !mutation.isPending;

  function switchMode(next: TargetingMode) {
    setMode(next);
    if (next !== "byRole") setTargetRoles([]);
    if (next !== "byUser") {
      setSelectedUsers([]);
      setUserSearch("");
    }
  }

  function toggleUser(u: HubUser) {
    const label = userLabel(u);
    setSelectedUsers((prev) => {
      if (prev.some((x) => x.id === u.id)) {
        return prev.filter((x) => x.id !== u.id);
      }
      return [...prev, { id: u.id, label }];
    });
  }

  function removeUser(id: string) {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));
  }

  const selectedIds = new Set(selectedUsers.map((u) => u.id));

  return (
    <>
      <DialogHeader>
        <DialogTitle>Send notification</DialogTitle>
        <DialogDescription>
          Send a personal notification to staff in your organization. Recipients see it in their app inbox.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="sn-title">Title</Label>
          <Input
            id="sn-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sn-msg">Message</Label>
          <Textarea
            id="sn-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={1000}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sn-type">Type</Label>
          <select
            id="sn-type"
            value={type}
            onChange={(e) => setType(e.target.value as HubManualNotificationType)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm interactive-cursor"
          >
            {HUB_MANUAL_NOTIFICATION_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Recipients</Label>
          <TargetingModeToggle mode={mode} onModeChange={switchMode} />
        </div>

        {mode === "byRole" ? (
          <div className="space-y-1">
            <MultiSelectDropdown<StaffNotificationTargetRole>
              label="Roles"
              emptyLabel="Select roles"
              options={STAFF_ROLE_OPTIONS}
              selected={targetRoles}
              onChange={setTargetRoles}
            />
            <p className="text-xs text-muted-foreground">
              Sends one notification per active user with the selected role.
            </p>
          </div>
        ) : null}

        {mode === "byUser" ? (
          <div className="space-y-2">
            <Label>Specific employees</Label>
            {selectedUsers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((u) => (
                  <Badge key={u.id} variant="secondary" className="gap-1 text-xs">
                    {u.label}
                    <button
                      type="button"
                      className="interactive-cursor rounded-full p-0.5 hover:bg-muted"
                      onClick={() => removeUser(u.id)}
                      aria-label={`Remove ${u.label}`}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : null}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search staff…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {usersQuery.isPending ? (
              <p className="text-xs text-muted-foreground">Loading staff…</p>
            ) : usersQuery.isError ? (
              <p className="text-xs text-destructive">{handleApiError(usersQuery.error)}</p>
            ) : filteredStaff.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active staff to notify.</p>
            ) : (
              <ul className="max-h-36 overflow-auto rounded-lg border border-border/40 py-1 text-sm">
                {filteredStaff.map((u) => (
                  <li key={u.id}>
                    <label className="flex interactive-cursor items-center gap-2 px-3 py-2 hover:bg-muted/60">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(u.id)}
                        onChange={() => toggleUser(u)}
                        className="size-4 rounded"
                      />
                      <span className="flex flex-col">
                        <span className="font-medium">{userLabel(u)}</span>
                        <span className="text-xs text-muted-foreground">
                          {u.role}
                          {u.email ? ` · ${u.email}` : ""}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              Select one or more staff or sales agents.
            </p>
          </div>
        ) : null}

        {mode === "allStaff" ? (
          <p className="text-xs text-muted-foreground">
            Delivers to all active staff and sales agents in your organization.
          </p>
        ) : null}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="button" onClick={() => mutation.mutate()} disabled={!canSubmit}>
          {mutation.isPending ? "Sending…" : "Send notification"}
        </Button>
      </DialogFooter>
    </>
  );
}

function TargetingModeToggle({
  mode,
  onModeChange,
}: {
  mode: TargetingMode;
  onModeChange: (m: TargetingMode) => void;
}) {
  const options: { value: TargetingMode; label: string; description: string }[] = [
    { value: "allStaff", label: "All staff", description: "Staff + sales agents" },
    { value: "byRole", label: "By role", description: "Filter by role" },
    { value: "byUser", label: "Specific", description: "Pick employees" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onModeChange(opt.value)}
          className={cn(
            "interactive-cursor rounded-lg border p-2.5 text-left transition-colors",
            mode === opt.value ? "border-primary bg-primary/5" : "border-border/60 hover:border-border",
          )}
          aria-pressed={mode === opt.value}
        >
          <p className="text-sm font-medium text-foreground">{opt.label}</p>
          <p className="text-[0.65rem] text-muted-foreground">{opt.description}</p>
        </button>
      ))}
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";
import axios from "axios";
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
import { fetchPlatformUsersPage } from "@/lib/api/platform/users";
import { broadcastPlatformNotification } from "@/lib/api/platform/notifications";
import { handleApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types/domain";
import {
  PLATFORM_NOTIFICATION_TYPE_OPTIONS,
  type BroadcastNotificationDto,
  type PlatformNotificationType,
  type PlatformUser,
} from "@/lib/types/platform";

type NotificationMode = "broadcast" | "targeted";

interface SelectedOrg {
  id: string;
  name: string;
}

interface SelectedUser {
  id: string;
  label: string;
}

const ROLE_OPTIONS: MultiSelectOption<UserRole>[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "STAFF", label: "Staff" },
  { value: "SALES_AGENT", label: "Sales agent" },
];

interface CreateNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateNotificationModal({ open, onOpenChange }: CreateNotificationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <NotificationForm key={String(open)} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Use CreateNotificationModal */
export const BroadcastNotificationModal = CreateNotificationModal;

/**
 * Both broadcast and targeted sends use POST /platform/notifications/broadcast.
 * Recipient resolution is server-side (targetUserIds > targetRoles > org-wide).
 */
function buildNotificationPayload(input: {
  mode: NotificationMode;
  title: string;
  message: string;
  type: PlatformNotificationType;
  sendToAllOrgs: boolean;
  selectedOrgs: SelectedOrg[];
  targetRoles: UserRole[];
  selectedUsers: SelectedUser[];
}): BroadcastNotificationDto {
  const base = {
    title: input.title,
    message: input.message,
    type: input.type,
  };
  const orgIds = input.selectedOrgs.map((o) => o.id);
  const userIds = [...new Set(input.selectedUsers.map((u) => u.id))];

  if (input.mode === "broadcast") {
    return {
      ...base,
      ...(input.sendToAllOrgs || orgIds.length === 0 ? {} : { targetOrganizations: orgIds }),
      ...(input.targetRoles.length > 0 ? { targetRoles: input.targetRoles } : {}),
    };
  }

  if (userIds.length > 0) {
    return {
      ...base,
      targetUserIds: userIds,
      ...(orgIds.length > 0 ? { targetOrganizations: orgIds } : {}),
    };
  }

  return {
    ...base,
    ...(orgIds.length > 0 ? { targetOrganizations: orgIds } : {}),
    ...(input.targetRoles.length > 0 ? { targetRoles: input.targetRoles } : {}),
  };
}

function formatBroadcastError(err: unknown): string {
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

function userLabel(u: PlatformUser): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  return u.email ?? u.id;
}

function NotificationForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<NotificationMode>("broadcast");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<PlatformNotificationType>("SYSTEM_ALERT");
  const [sendToAllOrgs, setSendToAllOrgs] = useState(true);
  const [selectedOrgs, setSelectedOrgs] = useState<SelectedOrg[]>([]);
  const [targetRoles, setTargetRoles] = useState<UserRole[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [orgSearch, setOrgSearch] = useState("");
  const [debouncedOrgSearch, setDebouncedOrgSearch] = useState("");
  const [orgPickerOpen, setOrgPickerOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [debouncedUserSearch, setDebouncedUserSearch] = useState("");

  const singleOrgId = mode === "targeted" && selectedOrgs.length === 1 ? selectedOrgs[0].id : undefined;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedOrgSearch(orgSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [orgSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedUserSearch(userSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [userSearch]);

  const orgSearchQuery = useQuery({
    queryKey: ["platform", "organizations", "notification-pick", debouncedOrgSearch],
    queryFn: () =>
      fetchOrganizationsPage({
        search: debouncedOrgSearch || undefined,
        page: 1,
        limit: 12,
      }),
    enabled: orgPickerOpen && debouncedOrgSearch.length > 0,
    placeholderData: keepPreviousData,
  });

  const usersQuery = useQuery({
    queryKey: ["platform", "users", "notification-pick", singleOrgId, debouncedUserSearch],
    queryFn: () =>
      fetchPlatformUsersPage({
        organizationId: singleOrgId,
        isActive: true,
        search: debouncedUserSearch || undefined,
        page: 1,
        limit: 50,
      }),
    enabled: Boolean(singleOrgId),
    placeholderData: keepPreviousData,
  });

  const mutation = useMutation({
    mutationFn: () =>
      broadcastPlatformNotification(
        buildNotificationPayload({
          mode,
          title: title.trim(),
          message: message.trim(),
          type,
          sendToAllOrgs,
          selectedOrgs,
          targetRoles,
          selectedUsers,
        }),
      ),
    onSuccess: (res) => {
      toast.success(`Sent ${res.notificationsSent} notifications to ${res.recipientCount} recipients.`);
      queryClient.invalidateQueries({ queryKey: ["platform"] });
      onClose();
    },
    onError: (err) => toast.error(formatBroadcastError(err)),
  });

  const hasTargetingCriteria =
    selectedOrgs.length > 0 || selectedUsers.length > 0 || targetRoles.length > 0;

  const canSubmit =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    !mutation.isPending &&
    (mode === "broadcast"
      ? sendToAllOrgs || selectedOrgs.length > 0
      : hasTargetingCriteria);

  function switchMode(next: NotificationMode) {
    setMode(next);
    if (next === "broadcast") {
      clearUserPicker();
    } else {
      setSendToAllOrgs(false);
    }
  }

  function clearUserPicker() {
    setSelectedUsers([]);
    setUserSearch("");
    setDebouncedUserSearch("");
  }

  function addOrg(org: SelectedOrg) {
    if (!selectedOrgs.some((o) => o.id === org.id)) {
      const nextCount = selectedOrgs.length + 1;
      setSelectedOrgs((prev) => [...prev, org]);
      if (nextCount !== 1) clearUserPicker();
    }
    setOrgSearch("");
    setDebouncedOrgSearch("");
    setOrgPickerOpen(false);
  }

  function removeOrg(id: string) {
    const next = selectedOrgs.filter((o) => o.id !== id);
    setSelectedOrgs(next);
    if (next.length !== 1) clearUserPicker();
  }

  function toggleUser(u: PlatformUser) {
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

  const showOrgPicker = mode === "targeted" || !sendToAllOrgs;
  const rolesDisabled = mode === "targeted" && selectedUsers.length > 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create notification</DialogTitle>
        <DialogDescription>
          Send an org-wide broadcast or target specific organizations, users, or roles. All sends use the platform broadcast API.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <ModeToggle mode={mode} onModeChange={switchMode} />

        <SharedFields
          title={title}
          message={message}
          type={type}
          onTitleChange={setTitle}
          onMessageChange={setMessage}
          onTypeChange={setType}
        />

        {mode === "broadcast" ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendToAllOrgs}
              onChange={(e) => {
                setSendToAllOrgs(e.target.checked);
                if (e.target.checked) setSelectedOrgs([]);
              }}
              className="size-4 rounded"
            />
            <span>Send to all active organizations</span>
          </label>
        ) : null}

        {showOrgPicker ? (
          <OrgMultiPicker
            selectedOrgs={selectedOrgs}
            orgSearch={orgSearch}
            debouncedOrgSearch={debouncedOrgSearch}
            pickerOpen={orgPickerOpen}
            searchQuery={orgSearchQuery}
            onOrgSearchChange={setOrgSearch}
            onPickerOpenChange={setOrgPickerOpen}
            onAddOrg={addOrg}
            onRemoveOrg={removeOrg}
            helperText={
              mode === "targeted"
                ? "Select one or more organizations, or use roles/users below."
                : "Pick at least one organization, or enable “all active organizations”."
            }
          />
        ) : null}

        {mode === "targeted" ? (
          <UserPickerSection
            selectedOrgs={selectedOrgs}
            selectedUsers={selectedUsers}
            userSearch={userSearch}
            usersQuery={usersQuery}
            onUserSearchChange={setUserSearch}
            onToggleUser={toggleUser}
            onRemoveUser={removeUser}
          />
        ) : null}

        <RoleFilter
          targetRoles={targetRoles}
          onTargetRolesChange={setTargetRoles}
          disabled={rolesDisabled}
          emptyLabel={mode === "broadcast" ? "Org-wide broadcast" : "Any role"}
          helperText={
            rolesDisabled
              ? "Clear selected users to filter by role."
              : mode === "broadcast"
                ? "Empty roles → one notification per organization with userId omitted (tenant admins)."
                : "Optional. Sends one personal notification per matching user in the org filter."
          }
        />
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

function ModeToggle({
  mode,
  onModeChange,
}: {
  mode: NotificationMode;
  onModeChange: (m: NotificationMode) => void;
}) {
  const options: { value: NotificationMode; label: string; description: string }[] = [
    {
      value: "broadcast",
      label: "Broadcast to all",
      description: "All active orgs or a scoped org/role blast",
    },
    {
      value: "targeted",
      label: "Send to targets",
      description: "Pick orgs, users, or roles",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onModeChange(opt.value)}
          className={cn(
            "rounded-lg border p-3 text-left transition-colors",
            mode === opt.value ? "border-primary bg-primary/5" : "border-border/60 hover:border-border",
          )}
          aria-pressed={mode === opt.value}
        >
          <p className="text-sm font-medium text-foreground">{opt.label}</p>
          <p className="text-xs text-muted-foreground">{opt.description}</p>
        </button>
      ))}
    </div>
  );
}

function SharedFields({
  title,
  message,
  type,
  onTitleChange,
  onMessageChange,
  onTypeChange,
}: {
  title: string;
  message: string;
  type: PlatformNotificationType;
  onTitleChange: (v: string) => void;
  onMessageChange: (v: string) => void;
  onTypeChange: (v: PlatformNotificationType) => void;
}) {
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor="nc-title">Title</Label>
        <Input
          id="nc-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={200}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="nc-msg">Message</Label>
        <Textarea
          id="nc-msg"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          rows={4}
          maxLength={2000}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="nc-type">Type</Label>
        <select
          id="nc-type"
          value={type}
          onChange={(e) => onTypeChange(e.target.value as PlatformNotificationType)}
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          {PLATFORM_NOTIFICATION_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

function RoleFilter({
  targetRoles,
  onTargetRolesChange,
  disabled,
  emptyLabel,
  helperText,
}: {
  targetRoles: UserRole[];
  onTargetRolesChange: (roles: UserRole[]) => void;
  disabled: boolean;
  emptyLabel: string;
  helperText: string;
}) {
  return (
    <div className="space-y-1">
      <MultiSelectDropdown<UserRole>
        label="Target roles"
        emptyLabel={emptyLabel}
        options={ROLE_OPTIONS}
        selected={targetRoles}
        onChange={onTargetRolesChange}
        className={disabled ? "pointer-events-none opacity-50" : undefined}
      />
      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  );
}

function OrgMultiPicker({
  selectedOrgs,
  orgSearch,
  debouncedOrgSearch,
  pickerOpen,
  searchQuery,
  onOrgSearchChange,
  onPickerOpenChange,
  onAddOrg,
  onRemoveOrg,
  helperText,
}: {
  selectedOrgs: SelectedOrg[];
  orgSearch: string;
  debouncedOrgSearch: string;
  pickerOpen: boolean;
  searchQuery: ReturnType<typeof useQuery>;
  onOrgSearchChange: (v: string) => void;
  onPickerOpenChange: (open: boolean) => void;
  onAddOrg: (org: SelectedOrg) => void;
  onRemoveOrg: (id: string) => void;
  helperText: string;
}) {
  const results = (searchQuery.data as { data?: { id: string; name: string; email?: string | null }[] } | undefined)
    ?.data;

  return (
    <div className="space-y-2">
      <Label>Organizations</Label>
      <div className="flex flex-wrap gap-2">
        {selectedOrgs.map((org) => (
          <Badge key={org.id} variant="secondary" className="gap-1 text-xs">
            {org.name}
            <button
              type="button"
              className="rounded-full p-0.5 hover:bg-muted"
              onClick={() => onRemoveOrg(org.id)}
              aria-label={`Remove ${org.name}`}
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
          onChange={(e) => onOrgSearchChange(e.target.value)}
          onFocus={() => onPickerOpenChange(true)}
          onBlur={() => window.setTimeout(() => onPickerOpenChange(false), 150)}
          className="pl-9"
        />
        {pickerOpen && debouncedOrgSearch && results?.length ? (
          <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-auto rounded-lg border bg-card py-1 text-sm shadow-md">
            {results
              .filter((o) => !selectedOrgs.some((s) => s.id === o.id))
              .map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected="false"
                    className="flex w-full flex-col px-3 py-2 text-left hover:bg-muted/60"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onAddOrg({ id: o.id, name: o.name })}
                  >
                    <span className="font-medium">{o.name}</span>
                    <span className="text-xs text-muted-foreground">{o.email ?? o.id}</span>
                  </button>
                </li>
              ))}
          </ul>
        ) : null}
      </div>
      {searchQuery.isError ? (
        <p className="text-xs text-destructive">{handleApiError(searchQuery.error)}</p>
      ) : null}
      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  );
}

function UserPickerSection({
  selectedOrgs,
  selectedUsers,
  userSearch,
  usersQuery,
  onUserSearchChange,
  onToggleUser,
  onRemoveUser,
}: {
  selectedOrgs: SelectedOrg[];
  selectedUsers: SelectedUser[];
  userSearch: string;
  usersQuery: ReturnType<typeof useQuery>;
  onUserSearchChange: (v: string) => void;
  onToggleUser: (u: PlatformUser) => void;
  onRemoveUser: (id: string) => void;
}) {
  const canPickUsers = selectedOrgs.length === 1;
  const users = (usersQuery.data as { data?: PlatformUser[] } | undefined)?.data ?? [];
  const selectedIds = new Set(selectedUsers.map((u) => u.id));

  return (
    <div className="space-y-2">
      <Label>Users (optional)</Label>
      {!canPickUsers ? (
        <p className="text-xs text-muted-foreground">
          Select exactly one organization to choose specific users.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((u) => (
              <Badge key={u.id} variant="secondary" className="gap-1 text-xs">
                {u.label}
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-muted"
                  onClick={() => onRemoveUser(u.id)}
                  aria-label={`Remove ${u.label}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users in org…"
              value={userSearch}
              onChange={(e) => onUserSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          {usersQuery.isPending ? (
            <p className="text-xs text-muted-foreground">Loading users…</p>
          ) : usersQuery.isError ? (
            <p className="text-xs text-destructive">{handleApiError(usersQuery.error)}</p>
          ) : users.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active users in this organization.</p>
          ) : (
            <ul className="max-h-36 overflow-auto rounded-lg border border-border/40 py-1 text-sm">
              {users.map((u) => (
                <li key={u.id}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-muted/60">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(u.id)}
                      onChange={() => onToggleUser(u)}
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
        </>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";
import { MoreHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchBranchesList } from "@/lib/api/branches";
import { handleApiError } from "@/lib/api/errors";
import {
  createStaff,
  deactivateStaff,
  fetchStaffActivityLog,
  resetStaffPassword,
  setStaffPermissions,
  updateStaff,
  updateStaffRole,
} from "@/lib/api/staff";
import { formatCurrency, formatDate } from "@/lib/format";
import type { UserRole } from "@/lib/types/domain";
import type {
  HubBranchOption,
  HubStaffMember,
  StaffActivityEntry,
  StaffCredentialsPayload,
} from "@/lib/types/staff";
import { useAuthStore } from "@/stores/auth-store";
import { useStaffStore } from "@/stores/staff-store";
import { cn } from "@/lib/utils";

/** Example keys from StaffProfile.permissions in schema.prisma. */
const PRESET_PERMISSION_KEYS = [
  "canVoidSales",
  "canAdjustStock",
  "canViewReports",
  "canCreateTemporaryItems",
] as const;

function staffDisplayName(m: HubStaffMember) {
  const n = [m.firstName, m.lastName].filter(Boolean).join(" ");
  return n || m.email || "—";
}

function splitFullName(full: string): { firstName: string; lastName?: string } {
  const t = full.trim();
  const i = t.indexOf(" ");
  if (i === -1) return { firstName: t };
  return { firstName: t.slice(0, i), lastName: t.slice(i + 1).trim() || undefined };
}

function canManageStaff(role: UserRole | undefined) {
  return role === "ADMIN" || role === "MANAGER" || role === "SUPER_ADMIN";
}

function actorCanMutateTarget(actor: UserRole | undefined, target: HubStaffMember) {
  if (!canManageStaff(actor)) return false;
  if (!target.isActive) return false;
  if (actor === "MANAGER" && target.role === "ADMIN") return false;
  return true;
}

function roleBadgeClass(role: string) {
  if (role === "ADMIN") return "border-primary/40 bg-primary/10 text-primary";
  if (role === "MANAGER") return "border-violet-500/40 bg-violet-500/10 text-violet-900 dark:text-violet-100";
  return "border-border/60 bg-muted/40 text-muted-foreground";
}

function metadataSummary(meta: Record<string, unknown> | null | undefined) {
  if (!meta || Object.keys(meta).length === 0) return "—";
  try {
    const s = JSON.stringify(meta);
    return s.length > 96 ? `${s.slice(0, 96)}…` : s;
  } catch {
    return "—";
  }
}

type CredentialsDialogProps = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  staffId: string;
  otp: string;
  body: string;
  /** Shown when OTP missing (e.g. parse mismatch) but staff was created. */
  footnote?: string;
};

function CredentialsDialog({
  open,
  onOpenChange,
  title,
  staffId,
  otp,
  body,
  footnote,
}: CredentialsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/40 bg-card/95 backdrop-blur-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Staff ID</p>
            <p className="font-mono text-lg font-semibold tracking-tight">{staffId || "—"}</p>
          </div>
          {otp ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">One-time login code</p>
              <div className="rounded-xl border-2 border-primary/50 bg-primary/5 px-4 py-4 text-center font-mono text-3xl font-bold tracking-[0.35em] text-primary">
                {otp}
              </div>
            </div>
          ) : (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              No code was returned. If this staff member already logged in once, their previous code may have expired.
              Use &quot;Reset password&quot; to issue a new code.
            </p>
          )}
          {footnote ? <p className="text-xs text-muted-foreground">{footnote}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function StaffPage() {
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
  const currency = useAuthStore((s) => s.organization?.currency) ?? "GHS";
  const members = useStaffStore((s) => s.members);
  const loading = useStaffStore((s) => s.loading);
  const loadErr = useStaffStore((s) => s.error);
  const loadStaff = useStaffStore((s) => s.loadStaff);
  const patchMember = useStaffStore((s) => s.patchMember);

  const performanceRows = useStaffStore((s) => s.performanceRows);
  const performanceLoading = useStaffStore((s) => s.performanceLoading);
  const performanceError = useStaffStore((s) => s.performanceError);
  const loadPerformance = useStaffStore((s) => s.loadPerformance);

  const [branches, setBranches] = useState<HubBranchOption[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [addFullName, setAddFullName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addRole, setAddRole] = useState<"STAFF" | "MANAGER">("STAFF");
  const [addJobTitle, setAddJobTitle] = useState("");
  const [addBranchId, setAddBranchId] = useState("");
  const [saving, setSaving] = useState(false);

  const [creds, setCreds] = useState<StaffCredentialsPayload | null>(null);

  const [detail, setDetail] = useState<HubStaffMember | null>(null);
  const [editTarget, setEditTarget] = useState<HubStaffMember | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editBranchId, setEditBranchId] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [resetTarget, setResetTarget] = useState<HubStaffMember | null>(null);
  const [resetting, setResetting] = useState(false);

  const [roleTarget, setRoleTarget] = useState<HubStaffMember | null>(null);
  const [roleValue, setRoleValue] = useState<string>("STAFF");
  const [roleSaving, setRoleSaving] = useState(false);

  const [permTarget, setPermTarget] = useState<HubStaffMember | null>(null);
  const [permDraft, setPermDraft] = useState<Record<string, boolean>>({});
  const [permSaving, setPermSaving] = useState(false);

  const [activityTarget, setActivityTarget] = useState<HubStaffMember | null>(null);
  const [activityItems, setActivityItems] = useState<StaffActivityEntry[]>([]);
  const [activityMeta, setActivityMeta] = useState<
    { page: number; limit: number; total: number; totalPages: number } | undefined
  >();
  const [activityPage, setActivityPage] = useState(1);
  const [activityLoading, setActivityLoading] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState<HubStaffMember | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const [perfFrom, setPerfFrom] = useState("");
  const [perfTo, setPerfTo] = useState("");

  const refresh = useCallback(async () => {
    const hadMembers = useStaffStore.getState().members.length > 0;
    await loadStaff();
    const err = useStaffStore.getState().error;
    if (err && hadMembers) toast.error(err);
  }, [loadStaff]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void loadPerformance();
  }, [loadPerformance]);

  useEffect(() => {
    void (async () => {
      try {
        const b = await fetchBranchesList();
        setBranches(b.filter((x) => x.isActive !== false));
      } catch {
        setBranches([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (performanceError) toast.error(performanceError);
  }, [performanceError]);

  const roleSelectOptions = useMemo(() => {
    if (!roleTarget) return ["STAFF", "MANAGER"];
    const base: string[] = ["STAFF", "MANAGER"];
    if (me?.role === "ADMIN" || me?.role === "SUPER_ADMIN") base.push("ADMIN");
    const r = String(roleTarget.role);
    const set = new Set<string>(base);
    if (r && r !== "SUPER_ADMIN" && !set.has(r)) set.add(r);
    return Array.from(set).filter((x) => x !== "SUPER_ADMIN");
  }, [roleTarget, me?.role]);

  const openEdit = (m: HubStaffMember) => {
    setEditTarget(m);
    setEditFullName(staffDisplayName(m));
    setEditPhone(m.phoneNumber ?? "");
    setEditJobTitle(m.jobTitle ?? "");
    setEditBranchId(m.branchId ?? "");
  };

  const openPermissions = (m: HubStaffMember) => {
    const keys = new Set<string>([...PRESET_PERMISSION_KEYS, ...Object.keys(m.permissions)]);
    const draft: Record<string, boolean> = {};
    keys.forEach((k) => {
      draft[k] = Boolean(m.permissions[k]);
    });
    setPermTarget(m);
    setPermDraft(draft);
  };

  const loadActivity = async (m: HubStaffMember, page: number) => {
    setActivityLoading(true);
    try {
      const { items, meta } = await fetchStaffActivityLog(m.id, { page, limit: 10 });
      setActivityItems(items);
      setActivityMeta(meta);
      setActivityPage(meta?.page ?? page);
    } catch (e) {
      toast.error(handleApiError(e));
    } finally {
      setActivityLoading(false);
    }
  };

  const openActivity = (m: HubStaffMember) => {
    setActivityTarget(m);
    setActivityPage(1);
    void loadActivity(m, 1);
  };

  async function onAddStaff(e: React.FormEvent) {
    e.preventDefault();
    const { firstName, lastName } = splitFullName(addFullName);
    if (!firstName) {
      toast.error("Please enter a full name.");
      return;
    }
    setSaving(true);
    try {
      const res = await createStaff({
        firstName,
        lastName,
        email: addEmail.trim(),
        phoneNumber: addPhone.trim(),
        role: addRole,
        jobTitle: addJobTitle.trim() || undefined,
        branchId: addBranchId || null,
      });
      toast.success("Staff member created");
      setAddOpen(false);
      setAddFullName("");
      setAddEmail("");
      setAddPhone("");
      setAddRole("STAFF");
      setAddJobTitle("");
      setAddBranchId("");
      setCreds(res);
      await refresh();
      if (res.member) patchMember(res.member.id, res.member);
    } catch (e) {
      const msg = handleApiError(e);
      if (axios.isAxiosError(e) && e.response?.status === 400) {
        const m = String(e.response?.data?.message ?? msg).toLowerCase();
        if (m.includes("otp") && m.includes("expir")) {
          toast.error("That login code has expired. Try again or reset the password after the account is created.");
          return;
        }
      }
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    const { firstName, lastName } = splitFullName(editFullName);
    if (!firstName) {
      toast.error("Please enter a name.");
      return;
    }
    setEditSaving(true);
    try {
      const updated = await updateStaff(editTarget.id, {
        firstName,
        lastName,
        phoneNumber: editPhone.trim() || undefined,
        jobTitle: editJobTitle.trim() || null,
        branchId: editBranchId || null,
      });
      patchMember(editTarget.id, updated);
      toast.success("Staff updated");
      setEditTarget(null);
    } catch (e) {
      toast.error(handleApiError(e));
    } finally {
      setEditSaving(false);
    }
  }

  async function onConfirmReset() {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const res = await resetStaffPassword(resetTarget.id);
      setResetTarget(null);
      setCreds(res);
      toast.success("New login code generated");
    } catch (e) {
      const msg = handleApiError(e);
      if (axios.isAxiosError(e) && e.response?.status === 400) {
        const m = String(e.response?.data?.message ?? msg).toLowerCase();
        if (m.includes("otp") && m.includes("expir")) {
          toast.error("That login code has expired. Request a new reset when the server allows it.");
          return;
        }
      }
      toast.error(msg);
    } finally {
      setResetting(false);
    }
  }

  async function onSaveRole() {
    if (!roleTarget) return;
    setRoleSaving(true);
    const prev = { ...roleTarget };
    patchMember(roleTarget.id, { role: roleValue as UserRole });
    try {
      const updated = await updateStaffRole(roleTarget.id, { role: roleValue });
      patchMember(roleTarget.id, updated);
      toast.success("Role updated");
      setRoleTarget(null);
    } catch (e) {
      patchMember(roleTarget.id, { role: prev.role });
      toast.error(handleApiError(e));
    } finally {
      setRoleSaving(false);
    }
  }

  async function onSavePermissions() {
    if (!permTarget) return;
    setPermSaving(true);
    try {
      const updated = await setStaffPermissions(permTarget.id, permDraft);
      patchMember(permTarget.id, { permissions: updated.permissions });
      toast.success("Permissions saved");
      setPermTarget(null);
    } catch (e) {
      toast.error(handleApiError(e));
    } finally {
      setPermSaving(false);
    }
  }

  async function onConfirmDeactivate() {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await deactivateStaff(deactivateTarget.id);
      patchMember(deactivateTarget.id, { isActive: false });
      toast.success("Staff deactivated");
      setDeactivateTarget(null);
    } catch (e) {
      toast.error(handleApiError(e));
    } finally {
      setDeactivating(false);
    }
  }

  function togglePerm(key: string, checked: boolean) {
    setPermDraft((d) => ({ ...d, [key]: checked }));
  }

  const permKeysSorted = useMemo(() => Object.keys(permDraft).sort(), [permDraft]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="text-sm text-muted-foreground">
            Manage your team, roles, and till permissions. Your shop stays private — we never ask for your organization ID here.
          </p>
        </div>
        {canManageStaff(me?.role) ? (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <Button type="button" className="shrink-0" onClick={() => setAddOpen(true)}>
              Add staff
            </Button>
            <DialogContent className="border-border/40 bg-card/95 backdrop-blur-md sm:max-w-md">
              <form onSubmit={onAddStaff}>
                <DialogHeader>
                  <DialogTitle>Add staff member</DialogTitle>
                  <DialogDescription>
                    We will create their account and a one-time code they use the first time they open the sales staff app.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-name">Full name</Label>
                    <Input
                      id="add-name"
                      className="min-h-11"
                      value={addFullName}
                      onChange={(e) => setAddFullName(e.target.value)}
                      placeholder="e.g. Ama Mensah"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-email">Email</Label>
                    <Input
                      id="add-email"
                      type="email"
                      className="min-h-11"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-phone">Phone</Label>
                    <Input
                      id="add-phone"
                      className="min-h-11"
                      value={addPhone}
                      onChange={(e) => setAddPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-role">Role</Label>
                    <select
                      id="add-role"
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      value={addRole}
                      onChange={(e) => setAddRole(e.target.value as "STAFF" | "MANAGER")}
                    >
                      <option value="STAFF">Staff</option>
                      <option value="MANAGER">Manager</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-job">Job title</Label>
                    <Input
                      id="add-job"
                      className="min-h-11"
                      value={addJobTitle}
                      onChange={(e) => setAddJobTitle(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-branch">Branch (optional)</Label>
                    <select
                      id="add-branch"
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      value={addBranchId}
                      onChange={(e) => setAddBranchId(e.target.value)}
                    >
                      <option value="">No branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Create staff"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <Card className="border-border/40 bg-card/80 shadow-sm backdrop-blur-sm">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-medium">Team</CardTitle>
          {!loading && members.length > 0 ? (
            <p className="text-xs text-muted-foreground">{members.length} member{members.length === 1 ? "" : "s"}</p>
          ) : null}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : members.length === 0 ? (
            loadErr ? (
              <EmptyState
                icon={<span>⚠️</span>}
                title="Could not load staff"
                description={loadErr}
                action={{ label: "Try again", onClick: () => void refresh() }}
              />
            ) : (
              <EmptyState
                icon={<span>👥</span>}
                title="No staff yet"
                description="Add people who work at your shop so they can sign in to the sales app with a staff ID and one-time code."
                action={
                  canManageStaff(me?.role)
                    ? { label: "Add staff", onClick: () => setAddOpen(true) }
                    : undefined
                }
              />
            )
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="font-mono text-xs">Staff ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Job title</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const canRow = actorCanMutateTarget(me?.role, m);
                  const showActions = canManageStaff(me?.role);
                  return (
                    <TableRow
                      key={m.id}
                      className={cn("transition-colors hover:bg-muted/40", !m.isActive && "opacity-60")}
                    >
                      <TableCell className="font-medium">{staffDisplayName(m)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{m.staffId}</TableCell>
                      <TableCell className="text-muted-foreground">{m.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs capitalize", roleBadgeClass(String(m.role)))}>
                          {String(m.role).toLowerCase().replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.jobTitle ?? "—"}</TableCell>
                      <TableCell>{m.phoneNumber ?? "—"}</TableCell>
                      <TableCell>
                        {m.isActive ? (
                          <span className="text-xs text-emerald-700 dark:text-emerald-300">Active</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Inactive</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {showActions ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="min-h-9 min-w-9"
                                  aria-label={`Actions for ${staffDisplayName(m)}`}
                                />
                              }
                            >
                              <MoreHorizontal className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-48">
                              <DropdownMenuItem onClick={() => router.push(`/staff/${m.id}`)}>
                                Profile page
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDetail(m)}>View details</DropdownMenuItem>
                              <DropdownMenuItem disabled={!canRow} onClick={() => openEdit(m)}>
                                Edit staff
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={!canRow} onClick={() => setResetTarget(m)}>
                                Reset password
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!canRow || m.id === me?.id}
                                onClick={() => {
                                  setRoleTarget(m);
                                  setRoleValue(String(m.role));
                                }}
                              >
                                Change role
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={!canRow} onClick={() => openPermissions(m)}>
                                Set permissions
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openActivity(m)}>Activity log</DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={!canRow || m.id === me?.id}
                                onClick={() => setDeactivateTarget(m)}
                              >
                                Deactivate staff
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/80 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Performance</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sales totals from your backend. Optional dates filter the range when the API supports it.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="perf-from" className="text-xs">
                From
              </Label>
              <Input id="perf-from" type="date" className="min-h-10 w-40" value={perfFrom} onChange={(e) => setPerfFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="perf-to" className="text-xs">
                To
              </Label>
              <Input id="perf-to" type="date" className="min-h-10 w-40" value={perfTo} onChange={(e) => setPerfTo(e.target.value)} />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-10"
              disabled={performanceLoading}
              onClick={() =>
                void loadPerformance({
                  from: perfFrom || undefined,
                  to: perfTo || undefined,
                })
              }
            >
              {performanceLoading ? "Loading…" : "Apply dates"}
            </Button>
          </div>
          {performanceLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : performanceRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No performance data yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead className="text-right">Total sales</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceRows.map((row, idx) => (
                  <TableRow key={row.id ?? `${row.staffName}-${idx}`}>
                    <TableCell className="font-medium">{row.staffName}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(row.totalSales, currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.transactionCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CredentialsDialog
        open={!!creds}
        onOpenChange={(o) => !o && setCreds(null)}
        title="Share this login code"
        staffId={creds?.staffId ?? ""}
        otp={creds?.otp ?? ""}
        body="Give this code to the staff member so they can log in to the sales staff app with their staff ID."
      />

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="border-border/40 bg-card/95 backdrop-blur-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Staff details</DialogTitle>
            <DialogDescription>Read-only summary from your directory.</DialogDescription>
          </DialogHeader>
          {detail ? (
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Name</dt>
                <dd className="font-medium">{staffDisplayName(detail)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Staff ID</dt>
                <dd className="font-mono">{detail.staffId}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd>{detail.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd>{detail.phoneNumber ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Role</dt>
                <dd className="capitalize">{String(detail.role).toLowerCase().replace("_", " ")}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Job title</dt>
                <dd>{detail.jobTitle ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Branch</dt>
                <dd>{detail.branch?.name ?? (detail.branchId ? detail.branchId : "—")}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd>{detail.isActive ? "Active" : "Inactive"}</dd>
              </div>
            </dl>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDetail(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="border-border/40 bg-card/95 backdrop-blur-md sm:max-w-md">
          <form onSubmit={onSaveEdit}>
            <DialogHeader>
              <DialogTitle>Edit staff</DialogTitle>
              <DialogDescription>Updates name, phone, job title, and branch assignment.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ed-name">Full name</Label>
                <Input
                  id="ed-name"
                  className="min-h-11"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ed-phone">Phone</Label>
                <Input id="ed-phone" className="min-h-11" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ed-job">Job title</Label>
                <Input id="ed-job" className="min-h-11" value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ed-branch">Branch</Label>
                <select
                  id="ed-branch"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={editBranchId}
                  onChange={(e) => setEditBranchId(e.target.value)}
                >
                  <option value="">No branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password?</DialogTitle>
            <DialogDescription>
              This generates a new one-time code for{" "}
              <span className="font-medium text-foreground">
                {resetTarget ? staffDisplayName(resetTarget) : ""}
              </span>
              . Their old code will stop working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResetTarget(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={resetting} onClick={() => void onConfirmReset()}>
              {resetting ? "Working…" : "Reset password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!roleTarget} onOpenChange={(o) => !o && setRoleTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>Super admin cannot be assigned from this screen.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="role-pick">Role</Label>
            <select
              id="role-pick"
              className="mt-2 flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={roleValue}
              onChange={(e) => setRoleValue(e.target.value)}
            >
              {roleSelectOptions.map((r) => (
                <option key={r} value={r}>
                  {r.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRoleTarget(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={roleSaving} onClick={() => void onSaveRole()}>
              {roleSaving ? "Saving…" : "Save role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!permTarget} onOpenChange={(o) => !o && setPermTarget(null)}>
        <DialogContent className="border-border/40 bg-card/95 backdrop-blur-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Permissions</DialogTitle>
            <DialogDescription>
              Stored as JSON on the staff profile. Toggle what this person can do in the till and hub.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-3 overflow-y-auto py-2">
            {permKeysSorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">No permission keys yet.</p>
            ) : (
              permKeysSorted.map((key) => (
                <label key={key} className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{key}</span>
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    checked={Boolean(permDraft[key])}
                    onChange={(e) => togglePerm(key, e.target.checked)}
                  />
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPermTarget(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={permSaving} onClick={() => void onSavePermissions()}>
              {permSaving ? "Saving…" : "Save permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!activityTarget} onOpenChange={(o) => !o && setActivityTarget(null)}>
        <DialogContent className="border-border/40 bg-card/95 backdrop-blur-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Activity log</DialogTitle>
            <DialogDescription>
              {activityTarget ? staffDisplayName(activityTarget) : ""} — recent actions.
            </DialogDescription>
          </DialogHeader>
          {activityLoading ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : activityItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No activity entries yet.</p>
          ) : (
            <ul className="max-h-80 space-y-3 overflow-y-auto border-l-2 border-border/60 pl-4">
              {activityItems.map((entry, i) => (
                <li key={entry.id ?? `${entry.createdAt}-${i}`} className="relative text-sm">
                  <span className="absolute -left-[calc(0.5rem+2px)] top-1.5 size-2 -translate-x-1/2 rounded-full bg-primary" />
                  <p className="font-medium">{entry.action}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">{metadataSummary(entry.metadata ?? undefined)}</p>
                </li>
              ))}
            </ul>
          )}
          {activityMeta && activityMeta.totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
              <span>
                Page {activityMeta.page} of {activityMeta.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={activityPage <= 1 || activityLoading || !activityTarget}
                  onClick={() => activityTarget && void loadActivity(activityTarget, activityPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    !activityMeta ||
                    activityPage >= activityMeta.totalPages ||
                    activityLoading ||
                    !activityTarget
                  }
                  onClick={() => activityTarget && void loadActivity(activityTarget, activityPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActivityTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deactivateTarget} onOpenChange={(o) => !o && setDeactivateTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate this staff member?</DialogTitle>
            <DialogDescription>They will no longer be able to sign in. Past sales and history stay on file.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeactivateTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={deactivating} onClick={() => void onConfirmDeactivate()}>
              {deactivating ? "Deactivating…" : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

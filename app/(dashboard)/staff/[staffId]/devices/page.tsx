"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchStaffById } from "@/lib/api/staff";
import { handleApiError } from "@/lib/api/errors";
import { formatDateDMY, formatTime12h } from "@/lib/format";
import type { HubStaffMember } from "@/lib/types/staff";

function staffName(m: HubStaffMember): string {
  const n = [m.firstName, m.lastName].filter(Boolean).join(" ");
  return n || m.email || "—";
}

export default function StaffDevicesPage() {
  const params = useParams();
  const staffId = params.staffId as string;
  const [member, setMember] = useState<HubStaffMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const m = await fetchStaffById(staffId);
        if (!cancelled) setMember(m);
      } catch (e) {
        if (!cancelled) toast.error(handleApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staffId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" className="min-h-9" render={<Link href="/staff" />}>
          <ArrowLeft className="size-4" aria-hidden />
          Staff
        </Button>
        <p className="text-sm text-muted-foreground">Staff member could not be loaded.</p>
      </div>
    );
  }

  const offset = member.lastDeviceTimeOffsetMinutes;
  const hasWarning =
    (typeof offset === "number" && offset !== 0) ||
    Boolean(member.lastDeviceTimeWarningAt);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" className="min-h-9" render={<Link href="/staff" />}>
          <ArrowLeft className="size-4" aria-hidden />
          Staff
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{staffName(member)}</h1>
        {hasWarning ? (
          <Badge
            variant="outline"
            className="gap-1 border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100"
          >
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
            Device time incorrect
          </Badge>
        ) : (
          <Badge variant="secondary" className="font-normal">
            No device time warnings
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">Device health for this staff member.</p>

      <Card className="border-border/40 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Device</CardTitle>
          <CardDescription>Last reported from the staff app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {hasWarning ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 dark:bg-amber-500/10">
              <p className="font-medium text-foreground">
                {typeof offset === "number" && offset !== 0
                  ? `Device is ${Math.abs(offset)} minutes ${offset > 0 ? "ahead" : "behind"}.`
                  : "Device time may be incorrect."}
              </p>
              <p className="mt-2 text-muted-foreground">
                Sales timestamps may be inaccurate until the device clock is fixed.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">No active time skew reported for this profile.</p>
          )}

          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Device model</dt>
              <dd className="font-medium">{member.lastDeviceTimeModel ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last warning</dt>
              <dd className="font-medium">
                {member.lastDeviceTimeWarningAt
                  ? `${formatDateDMY(member.lastDeviceTimeWarningAt)} · ${formatTime12h(member.lastDeviceTimeWarningAt)}`
                  : "—"}
              </dd>
            </div>
            {member.deviceTimeWarningCount != null ? (
              <div>
                <dt className="text-muted-foreground">Warnings (count)</dt>
                <dd className="font-medium tabular-nums">{member.deviceTimeWarningCount}</dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

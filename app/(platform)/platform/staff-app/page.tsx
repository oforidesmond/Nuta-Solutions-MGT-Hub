"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ChevronDown, Download, Package, RotateCw } from "lucide-react";
import { toast } from "sonner";
import {
  fetchCurrentStaffAppRelease,
  fetchStaffAppReleases,
  publishStaffAppRelease,
  registerStaffAppRelease,
} from "@/lib/api/platform/staff-app";
import { handleApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import { staffAppNestDownloadUrl } from "@/lib/staff-app";
import { cn } from "@/lib/utils";
import type { PlatformStaffAppRelease } from "@/lib/types/platform";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const QUERY_KEY = ["platform", "staff-app"] as const;

function publishedByLabel(release: PlatformStaffAppRelease): string {
  const by = release.publishedBy;
  if (!by) return "—";
  if (typeof by === "string") return by;
  return by.name || by.email || by.id || "—";
}

function conflictMessage(error: unknown): string | null {
  if (axios.isAxiosError(error) && error.response?.status === 409) {
    return "versionName or versionCode already exists";
  }
  return null;
}

export default function PlatformStaffAppPage() {
  const queryClient = useQueryClient();

  const currentQuery = useQuery({
    queryKey: [...QUERY_KEY, "current"],
    queryFn: fetchCurrentStaffAppRelease,
  });

  const listQuery = useQuery({
    queryKey: [...QUERY_KEY, "list"],
    queryFn: fetchStaffAppReleases,
  });

  const [versionName, setVersionName] = useState("");
  const [versionCode, setVersionCode] = useState("");
  const [apkFile, setApkFile] = useState<File | null>(null);

  const [regVersionName, setRegVersionName] = useState("");
  const [regVersionCode, setRegVersionCode] = useState("");
  const [regBlobUrl, setRegBlobUrl] = useState("");
  const [regApkFilename, setRegApkFilename] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);

  async function invalidateStaffApp() {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    await queryClient.invalidateQueries({ queryKey: ["staff-app", "update"] });
  }

  const publishMutation = useMutation({
    mutationFn: publishStaffAppRelease,
    onSuccess: async () => {
      toast.success("Staff app release published");
      setVersionName("");
      setVersionCode("");
      setApkFile(null);
      await invalidateStaffApp();
    },
    onError: (error) => {
      toast.error(conflictMessage(error) ?? handleApiError(error));
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerStaffAppRelease,
    onSuccess: async () => {
      toast.success("Staff app release registered");
      setRegVersionName("");
      setRegVersionCode("");
      setRegBlobUrl("");
      setRegApkFilename("");
      setRegisterOpen(false);
      await invalidateStaffApp();
    },
    onError: (error) => {
      toast.error(conflictMessage(error) ?? handleApiError(error));
    },
  });

  function onPublish(e: React.FormEvent) {
    e.preventDefault();
    const code = Number(versionCode);
    if (!versionName.trim()) {
      toast.error("versionName is required");
      return;
    }
    if (!Number.isFinite(code) || code <= 0) {
      toast.error("versionCode must be a positive number");
      return;
    }
    if (!apkFile) {
      toast.error("Select an APK file");
      return;
    }
    publishMutation.mutate({
      versionName: versionName.trim(),
      versionCode: code,
      file: apkFile,
    });
  }

  function onRegister(e: React.FormEvent) {
    e.preventDefault();
    const code = Number(regVersionCode);
    if (!regVersionName.trim() || !regBlobUrl.trim()) {
      toast.error("versionName and blobUrl are required");
      return;
    }
    if (!Number.isFinite(code) || code <= 0) {
      toast.error("versionCode must be a positive number");
      return;
    }
    registerMutation.mutate({
      versionName: regVersionName.trim(),
      versionCode: code,
      blobUrl: regBlobUrl.trim(),
      ...(regApkFilename.trim() ? { apkFilename: regApkFilename.trim() } : {}),
    });
  }

  const current = currentQuery.data ?? null;
  const releases = listQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Staff app releases
          </h1>
          <p className="text-sm text-muted-foreground">
            Publish the Android Staff APK Nest serves to tenants and OTA clients.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            void currentQuery.refetch();
            void listQuery.refetch();
          }}
          disabled={currentQuery.isFetching || listQuery.isFetching}
        >
          <RotateCw className="size-4" aria-hidden />
          Refresh
        </Button>
      </div>

      <Card className="gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Current release</h2>
            <p className="text-xs text-muted-foreground">
              Marked <code className="text-[11px]">isCurrent</code> on Nest —
              what Download APK installs.
            </p>
          </div>
          {current ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                window.location.href = staffAppNestDownloadUrl();
              }}
            >
              <Download className="size-4" aria-hidden />
              Download current
            </Button>
          ) : null}
        </div>

        {currentQuery.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : currentQuery.isError ? (
          <p className="text-sm text-destructive">{handleApiError(currentQuery.error)}</p>
        ) : !current ? (
          <EmptyState
            icon={<Package className="mx-auto size-8 text-muted-foreground" aria-hidden />}
            title="No current release published"
            description="Publish a new APK below or register an existing Blob upload."
          />
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">versionName</dt>
              <dd className="font-medium">{current.versionName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">versionCode</dt>
              <dd className="font-medium">{current.versionCode}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">apkFilename</dt>
              <dd className="font-medium break-all">{current.apkFilename}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">publishedAt</dt>
              <dd className="font-medium">{formatDate(current.publishedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">publishedBy</dt>
              <dd className="font-medium">{publishedByLabel(current)}</dd>
            </div>
          </dl>
        )}
      </Card>

      <Card className="gap-4 p-4">
        <div>
          <h2 className="text-sm font-medium">Publish new release</h2>
          <p className="text-xs text-muted-foreground">
            Multipart upload to Nest. Nest stores the APK in Blob and marks it current.
          </p>
        </div>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onPublish}>
          <div className="space-y-1.5">
            <Label htmlFor="staff-app-version-name">versionName</Label>
            <Input
              id="staff-app-version-name"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="1.0.1"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-app-version-code">versionCode</Label>
            <Input
              id="staff-app-version-code"
              type="number"
              min={1}
              step={1}
              value={versionCode}
              onChange={(e) => setVersionCode(e.target.value)}
              placeholder="2"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="staff-app-apk">APK file</Label>
            <Input
              id="staff-app-apk"
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              onChange={(e) => setApkFile(e.target.files?.[0] ?? null)}
            />
            {apkFile ? (
              <p className="text-xs text-muted-foreground">{apkFile.name}</p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={publishMutation.isPending}>
              {publishMutation.isPending ? "Publishing…" : "Publish release"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="gap-4 p-4">
        <Collapsible open={registerOpen} onOpenChange={setRegisterOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left interactive-cursor">
            <div>
              <h2 className="text-sm font-medium">Register existing Blob upload</h2>
              <p className="text-xs text-muted-foreground">
                Use this only when you uploaded the APK to Vercel Blob by hand
              </p>
            </div>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                registerOpen && "rotate-180",
              )}
              aria-hidden
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={onRegister}>
              <div className="space-y-1.5">
                <Label htmlFor="reg-version-name">versionName</Label>
                <Input
                  id="reg-version-name"
                  value={regVersionName}
                  onChange={(e) => setRegVersionName(e.target.value)}
                  placeholder="1.0.1"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-version-code">versionCode</Label>
                <Input
                  id="reg-version-code"
                  type="number"
                  min={1}
                  step={1}
                  value={regVersionCode}
                  onChange={(e) => setRegVersionCode(e.target.value)}
                  placeholder="2"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="reg-blob-url">blobUrl</Label>
                <Input
                  id="reg-blob-url"
                  value={regBlobUrl}
                  onChange={(e) => setRegBlobUrl(e.target.value)}
                  placeholder="https://….public.blob.vercel-storage.com/…"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="reg-apk-filename">apkFilename (optional)</Label>
                <Input
                  id="reg-apk-filename"
                  value={regApkFilename}
                  onChange={(e) => setRegApkFilename(e.target.value)}
                  placeholder="NutaPOS-Staff-v1.0.1.apk"
                  autoComplete="off"
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" variant="outline" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? "Registering…" : "Register release"}
                </Button>
              </div>
            </form>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Card className="gap-4 p-4">
        <div>
          <h2 className="text-sm font-medium">Recent releases</h2>
          <p className="text-xs text-muted-foreground">All published Staff App versions.</p>
        </div>

        {listQuery.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : listQuery.isError ? (
          <p className="text-sm text-destructive">{handleApiError(listQuery.error)}</p>
        ) : releases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No releases yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border/50">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border/50 bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">versionName</th>
                  <th className="px-3 py-2 font-medium">versionCode</th>
                  <th className="px-3 py-2 font-medium">apkFilename</th>
                  <th className="px-3 py-2 font-medium">isCurrent</th>
                  <th className="px-3 py-2 font-medium">publishedAt</th>
                </tr>
              </thead>
              <tbody>
                {releases.map((row) => (
                  <tr
                    key={`${row.versionName}-${row.versionCode}-${row.apkFilename}`}
                    className={cn(
                      "border-b border-border/40 last:border-0",
                      row.isCurrent && "bg-primary/5",
                    )}
                  >
                    <td className="px-3 py-2 font-medium">{row.versionName}</td>
                    <td className="px-3 py-2">{row.versionCode}</td>
                    <td className="px-3 py-2 break-all">{row.apkFilename}</td>
                    <td className="px-3 py-2">
                      {row.isCurrent ? (
                        <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                          Current
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.publishedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

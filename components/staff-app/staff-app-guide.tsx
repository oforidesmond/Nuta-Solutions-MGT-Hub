"use client";

import Link from "next/link";
import {
  Camera,
  Cpu,
  HardDrive,
  Printer,
  ScanBarcode,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Wifi,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/analytics/section-card";
import { StaffAppDownloadActions } from "@/components/staff-app/staff-app-download-actions";
import { cn } from "@/lib/utils";

type StaffAppGuideProps = {
  orgId: string;
  orgName: string;
  downloadAvailable: boolean;
};

const benefits = [
  {
    icon: ShoppingCart,
    title: "Sell on the floor",
    description: "Ring up sales without leaving the shop floor.",
  },
  {
    icon: ScanBarcode,
    title: "Scan barcodes",
    description: "Look up products quickly with the device camera.",
  },
  {
    icon: Printer,
    title: "Print receipts",
    description: "Connect a receipt printer over Bluetooth or USB.",
  },
  {
    icon: Wifi,
    title: "Stay in sync",
    description: "Sales sync to the hub when connectivity returns.",
  },
] as const;

const requirements = [
  {
    icon: Smartphone,
    label: "Android phone or tablet",
    detail: "Android 8.0 or newer",
    level: "Required" as const,
  },
  {
    icon: HardDrive,
    label: "4 GB RAM",
    detail: "Keeps checkout smooth under load",
    level: "Required" as const,
  },
  {
    icon: Camera,
    label: "Rear camera",
    detail: "For barcode scanning — you can still sell without it",
    level: "Recommended" as const,
  },
  {
    icon: Cpu,
    label: "Bluetooth",
    detail: "For wireless printers — USB cable also works",
    level: "Optional" as const,
  },
  {
    icon: Wifi,
    label: "Internet access",
    detail: "Needed to sync sales and stock with the hub",
    level: "Required" as const,
  },
] as const;

const installSteps = [
  {
    title: "Download the APK",
    description: "Tap Download APK on this page (or use a share link from your manager).",
  },
  {
    title: "Allow installs from your browser",
    description:
      'When prompted, allow installs from Chrome or your browser ("Install unknown apps").',
  },
  {
    title: "Open the file and install",
    description: "Open the downloaded APK from notifications or Downloads, then tap Install.",
  },
  {
    title: "Sign in with your staff credentials",
    description:
      "Use the Staff ID and one-time login code your manager created in the hub.",
  },
] as const;

function requirementBadgeClass(level: "Required" | "Recommended" | "Optional") {
  if (level === "Required") return "border-primary/40 bg-primary/10 text-primary";
  if (level === "Recommended") return "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100";
  return "border-border/60 bg-muted/40 text-muted-foreground";
}

export function StaffAppGuide({ orgId, orgName, downloadAvailable }: StaffAppGuideProps) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Smartphone className="size-6" aria-hidden />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Staff mobile app</h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              The sales staff app lets your team check out customers, scan products, and print
              receipts from an Android device.
            </p>
          </div>
        </div>
        {downloadAvailable ? (
          <StaffAppDownloadActions
            orgId={orgId}
            orgName={orgName}
            downloadAvailable={downloadAvailable}
            className="flex shrink-0 flex-wrap gap-2"
          />
        ) : null}
      </div>

      {!downloadAvailable ? (
        <EmptyState
          icon={<Smartphone className="mx-auto size-10 text-muted-foreground" aria-hidden />}
          title="Download not ready yet"
          description="The staff app file has not been uploaded yet. Check back soon or contact support."
        />
      ) : null}

      <SectionCard
        title="What it solves"
        description="Give floor staff a dedicated checkout tool instead of sharing one device or paper tallies."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex gap-3 rounded-xl border border-border/40 bg-muted/20 p-4"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Device requirements"
        description="Most modern Android phones work well. Optional hardware improves speed, not access."
        icon={ShieldCheck}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {requirements.map(({ icon: Icon, label, detail, level }) => (
            <div
              key={label}
              className="flex items-start justify-between gap-3 rounded-xl border border-border/40 bg-card/60 p-4"
            >
              <div className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4" aria-hidden />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{detail}</p>
                </div>
              </div>
              <Badge variant="outline" className={cn("shrink-0 text-[10px]", requirementBadgeClass(level))}>
                {level}
              </Badge>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Install in four steps"
        description="Follow these on each Android device you set up."
        icon={Smartphone}
      >
        <ul className="space-y-4 border-l-2 border-border/60 pl-4">
          {installSteps.map((step, index) => (
            <li key={step.title} className="relative text-sm">
              <span className="absolute -left-[calc(0.5rem+2px)] top-1.5 flex size-5 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <p className="font-medium">{step.title}</p>
              <p className="mt-0.5 text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ul>
      </SectionCard>

      <Card className="border-dashed border-border/60 bg-muted/10 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">After install</CardTitle>
          <CardDescription>
            Create staff accounts and share login codes from the Staff page in this hub.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/staff"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Go to Staff
          </Link>
        </CardContent>
      </Card>

      {downloadAvailable ? (
        <div className="flex flex-wrap gap-2 border-t border-border/40 pt-6">
          <StaffAppDownloadActions
            orgId={orgId}
            orgName={orgName}
            downloadAvailable={downloadAvailable}
            className="flex flex-wrap gap-2"
          />
        </div>
      ) : null}
    </div>
  );
}

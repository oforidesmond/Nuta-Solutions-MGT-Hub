"use client";

import { use, useMemo, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { LoginBrand } from "@/components/auth/login-brand";
import { LoginShell } from "@/components/auth/login-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStaffAppUpdate } from "@/lib/hooks/use-staff-app-update";

type PageProps = {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ label?: string }>;
};

function isLikelyAndroid(): boolean {
  if (typeof navigator === "undefined") return true;
  return /android/i.test(navigator.userAgent);
}

const troubleSteps = [
  "Allow installs from your browser when Android asks (Unknown apps).",
  "Open the downloaded APK from your Downloads folder or notification shade.",
  "Sign in with the Staff ID and one-time login code from your manager.",
] as const;

export default function GetStaffAppPage({ params, searchParams }: PageProps) {
  use(params);
  const { label: labelParam } = use(searchParams);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { downloadAvailable, downloadUrl, loading } = useStaffAppUpdate();

  const orgLabel = useMemo(() => {
    const raw = labelParam?.trim();
    if (!raw) return "your shop";
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [labelParam]);

  const androidDevice = isLikelyAndroid();

  function onConfirmDownload() {
    if (!downloadAvailable) {
      toast.error("Staff app download is not available yet.");
      setConfirmOpen(false);
      return;
    }
    setConfirmOpen(false);
    window.location.href = downloadUrl;
  }

  return (
    <LoginShell className="max-w-md">
      <div className="space-y-6">
        <LoginBrand
          description={`Install the sales staff app for ${orgLabel}.`}
        />

        <div className="rounded-xl border border-border/40 bg-muted/20 p-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Smartphone className="size-6" aria-hidden />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Checkout customers, scan barcodes, and print receipts from an Android device.
          </p>
        </div>

        {!androidDevice ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-900 dark:text-amber-100">
            Open this link on an Android phone or tablet to install the app.
          </p>
        ) : null}

        <Button
          type="button"
          className="h-11 w-full"
          disabled={loading || !downloadAvailable}
          onClick={() => setConfirmOpen(true)}
        >
          <Download className="size-4" aria-hidden />
          Download app
        </Button>

        {!loading && !downloadAvailable ? (
          <p className="text-center text-xs text-muted-foreground">
            Download is not available yet. Check back soon or ask your manager.
          </p>
        ) : null}

        <div className="text-center">
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => setShowHelp((v) => !v)}
          >
            {showHelp ? "Hide install tips" : "Having trouble?"}
          </button>
          {showHelp ? (
            <ol className="mt-3 space-y-2 text-left text-xs text-muted-foreground">
              {troubleSteps.map((step, i) => (
                <li key={step} className="flex gap-2">
                  <span className="font-medium text-foreground">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="border-border/40 bg-card/95 backdrop-blur-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download staff app?</DialogTitle>
            <DialogDescription>
              This will download the NutaPOS Staff App APK for <strong>{orgLabel}</strong>. Install
              it on this Android device to get started.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={onConfirmDownload}>
              <Download className="size-4" aria-hidden />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LoginShell>
  );
}

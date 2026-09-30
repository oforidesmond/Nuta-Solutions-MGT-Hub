"use client";

import { useCallback } from "react";
import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getStaffAppShareUrl } from "@/lib/constants";
import { useStaffAppUpdate } from "@/lib/hooks/use-staff-app-update";

type StaffAppDownloadActionsProps = {
  orgId: string;
  orgName: string;
  className?: string;
  size?: "default" | "sm" | "lg";
};

export function StaffAppDownloadActions({
  orgId,
  orgName,
  className,
  size = "default",
}: StaffAppDownloadActionsProps) {
  const { downloadAvailable, downloadUrl, loading } = useStaffAppUpdate();

  const onDownload = useCallback(() => {
    if (!downloadAvailable) {
      toast.error("Staff app download is not available yet.");
      return;
    }
    window.location.href = downloadUrl;
  }, [downloadAvailable, downloadUrl]);

  const onShare = useCallback(async () => {
    const url = getStaffAppShareUrl(orgId, orgName);
    const shareData = {
      title: "NutaPOS Staff App",
      text: `Install the NutaPOS sales staff app for ${orgName.trim() || "your shop"}.`,
      url,
    };

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Download link copied");
    } catch {
      toast.error("Could not copy the link. Copy it manually from the address bar after sharing.");
    }
  }, [orgId, orgName]);

  const downloadDisabled = loading || !downloadAvailable;

  return (
    <div className={className}>
      <Button type="button" size={size} disabled={downloadDisabled} onClick={onDownload}>
        <Download className="size-4" aria-hidden />
        Download APK
      </Button>
      <Button type="button" size={size} variant="outline" onClick={() => void onShare()}>
        <Share2 className="size-4" aria-hidden />
        Share link
      </Button>
    </div>
  );
}

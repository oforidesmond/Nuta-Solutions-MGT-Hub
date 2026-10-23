"use client";

import { useCallback } from "react";
import { Download, ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getStaffAppShareUrl } from "@/lib/constants";
import { useStaffAppUpdate } from "@/lib/hooks/use-staff-app-update";
import { STAFF_POS_PWA_URL } from "@/lib/staff-app";

type StaffAppDownloadActionsProps = {
  orgId: string;
  orgName: string;
  className?: string;
  size?: "default" | "sm" | "lg";
};

export function StaffPosWebAppLink({
  size = "default",
  className,
}: {
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  return (
    <Button
      variant="outline"
      size={size}
      className={className}
      nativeButton={false}
      render={
        <a href={STAFF_POS_PWA_URL} target="_blank" rel="noopener noreferrer" />
      }
    >
      <ExternalLink className="size-4" aria-hidden />
      Open web app
    </Button>
  );
}

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

  const showApkActions = loading || downloadAvailable;
  const downloadDisabled = loading || !downloadAvailable;

  return (
    <div className={className}>
      {showApkActions ? (
        <Button type="button" size={size} disabled={downloadDisabled} onClick={onDownload}>
          <Download className="size-4" aria-hidden />
          Download APK
        </Button>
      ) : null}
      <StaffPosWebAppLink size={size} />
      {showApkActions ? (
        <Button type="button" size={size} variant="outline" onClick={() => void onShare()}>
          <Share2 className="size-4" aria-hidden />
          Share link
        </Button>
      ) : null}
    </div>
  );
}

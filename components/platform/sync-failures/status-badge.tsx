import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlatformSyncFailureStatus } from "@/lib/types/platform";
import {
  syncFailureStatusLabel,
  syncFailureStatusTone,
} from "@/components/platform/sync-failures/presentation";

export function SyncFailureStatusBadge({
  status,
  className,
}: {
  status: PlatformSyncFailureStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", syncFailureStatusTone(status), className)}
    >
      {syncFailureStatusLabel(status)}
    </Badge>
  );
}

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlanStatus } from "@/lib/types/platform";

const statusClasses: Record<PlanStatus, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  SUSPENDED: "bg-destructive/10 text-destructive",
  TRIAL_EXPIRED: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  PAYMENT_OVERDUE: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
};

const statusLabel: Record<PlanStatus, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  TRIAL_EXPIRED: "Trial expired",
  PAYMENT_OVERDUE: "Payment overdue",
};

export function StatusBadge({
  status,
  className,
}: {
  status: PlanStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("border-transparent", statusClasses[status], className)}>
      {statusLabel[status] ?? status}
    </Badge>
  );
}

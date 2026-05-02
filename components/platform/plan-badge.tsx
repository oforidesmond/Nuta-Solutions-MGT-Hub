import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlanType } from "@/lib/types/platform";

const planClasses: Record<PlanType, string> = {
  FREE: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  TRIAL: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  PRO: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  ENTERPRISE: "bg-pink-500/10 text-pink-700 dark:text-pink-300",
};

const planLabel: Record<PlanType, string> = {
  FREE: "Free",
  TRIAL: "Trial",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

export function PlanBadge({
  plan,
  className,
}: {
  plan: PlanType;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("border-transparent", planClasses[plan], className)}>
      {planLabel[plan] ?? plan}
    </Badge>
  );
}

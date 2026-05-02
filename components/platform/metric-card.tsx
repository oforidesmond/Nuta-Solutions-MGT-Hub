import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type MetricCardTone = "primary" | "success" | "info" | "warning" | "danger";

const toneClasses: Record<MetricCardTone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600",
  info: "bg-cyan-500/10 text-cyan-600",
  warning: "bg-amber-500/10 text-amber-600",
  danger: "bg-destructive/10 text-destructive",
};

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  icon?: LucideIcon;
  tone?: MetricCardTone;
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  tone = "primary",
}: MetricCardProps) {
  return (
    <Card className="gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="mt-1 truncate font-heading text-2xl font-semibold text-foreground">
            {value}
          </p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              toneClasses[tone],
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>
      {trend ? (
        <p className="text-xs text-muted-foreground">{trend}</p>
      ) : null}
    </Card>
  );
}

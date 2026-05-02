import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  warning?: boolean;
}

export function StatCard({ label, value, subtitle, icon: Icon, warning = false }: StatCardProps) {
  return (
    <Card className="gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {Icon ? (
          <Icon
            className={cn(
              "size-4 shrink-0",
              warning ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/70",
            )}
            aria-hidden
          />
        ) : null}
      </div>
      <p
        className={cn(
          "font-heading text-xl font-semibold tabular-nums text-foreground",
          warning && "text-amber-600 dark:text-amber-400",
        )}
      >
        {value}
      </p>
      {subtitle ? (
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      ) : null}
    </Card>
  );
}

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface InfoCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function InfoCard({ title, description, children, className }: InfoCardProps) {
  return (
    <Card className={cn("gap-3 p-4", className)}>
      <div>
        <h3 className="font-heading text-sm font-semibold text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <dl className="flex flex-col gap-2 text-sm">{children}</dl>
    </Card>
  );
}

interface InfoRowProps {
  label: string;
  value: ReactNode;
  highlight?: boolean;
  mono?: boolean;
}

export function InfoRow({ label, value, highlight = false, mono = false }: InfoRowProps) {
  const display = value === undefined || value === null || value === "" ? "—" : value;
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 sm:grid-cols-[10rem_1fr]">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 break-words text-sm text-foreground",
          mono && "font-mono text-xs",
          highlight && "font-medium text-amber-600 dark:text-amber-400",
        )}
      >
        {display}
      </dd>
    </div>
  );
}

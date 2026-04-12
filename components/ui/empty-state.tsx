import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  className?: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
};

export function EmptyState({
  icon,
  title,
  description,
  className,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-14 text-center",
        className,
      )}
    >
      {icon != null ? <div className="mb-4 text-4xl opacity-90">{icon}</div> : null}
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {action ? (
          <Button type="button" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
        {secondaryAction ? (
          <Button type="button" variant="outline" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

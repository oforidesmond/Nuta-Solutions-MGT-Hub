import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
};

export function MetricTile({ label, value, sub, highlight }: Props) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        highlight ? "border-primary/30 bg-primary/5" : "border-border/40 bg-card/60",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          highlight ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

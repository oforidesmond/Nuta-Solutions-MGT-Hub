import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const dotTone: Record<StatusTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-destructive",
  info: "bg-cyan-500",
  neutral: "bg-muted-foreground/40",
};

const valueTone: Record<StatusTone, string> = {
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-destructive",
  info: "text-cyan-600",
  neutral: "text-foreground",
};

interface StatusCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function StatusCard({ title, description, children }: StatusCardProps) {
  return (
    <Card className="gap-3 p-4">
      <div>
        <p className="font-heading text-sm font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </Card>
  );
}

interface StatusItemProps {
  label: string;
  count: number | string;
  tone?: StatusTone;
  warning?: boolean;
}

export function StatusItem({
  label,
  count,
  tone = "neutral",
  warning = false,
}: StatusItemProps) {
  const effectiveTone: StatusTone = warning && tone === "neutral" ? "warning" : tone;
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn("size-2 shrink-0 rounded-full", dotTone[effectiveTone])}
          aria-hidden
        />
        <span className="truncate text-muted-foreground">{label}</span>
      </div>
      <span
        className={cn(
          "font-heading text-sm font-semibold tabular-nums",
          valueTone[effectiveTone],
        )}
      >
        {count}
      </span>
    </div>
  );
}

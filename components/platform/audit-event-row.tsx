import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlatformAuditEvent } from "@/lib/types/platform";

const PLATFORM_EVENT_PREFIX = "PLATFORM_";

function actorLabel(event: PlatformAuditEvent): string {
  if (event.user) {
    const name = [event.user.firstName, event.user.lastName].filter(Boolean).join(" ").trim();
    if (name) return name;
    if (event.user.email) return event.user.email;
  }
  return "System";
}

function safePrettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function AuditEventRow({
  event,
  showOrganization = false,
}: {
  event: PlatformAuditEvent;
  showOrganization?: boolean;
}) {
  const isPlatform = event.eventType.startsWith(PLATFORM_EVENT_PREFIX);
  const hasPayload =
    (event.payload && Object.keys(event.payload).length > 0) ||
    (event.metadata && Object.keys(event.metadata).length > 0);

  return (
    <li className="rounded-lg border border-border/60 bg-card p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "border-transparent font-mono text-[0.65rem]",
              isPlatform
                ? "bg-primary/10 text-primary"
                : "bg-muted text-foreground/70",
            )}
          >
            {event.eventType}
          </Badge>
          {event.aggregateType ? (
            <span className="text-xs text-muted-foreground">
              on <span className="font-medium text-foreground/80">{event.aggregateType}</span>
            </span>
          ) : null}
        </div>
        <span className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</span>
      </div>
      <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-[auto_1fr] sm:gap-x-4">
        <span>Actor</span>
        <span className="text-foreground/90">{actorLabel(event)}</span>
        {showOrganization && event.organization ? (
          <>
            <span>Organization</span>
            <span className="text-foreground/90">{event.organization.name}</span>
          </>
        ) : null}
        {event.aggregateId ? (
          <>
            <span>Aggregate ID</span>
            <span className="break-all font-mono text-foreground/80">{event.aggregateId}</span>
          </>
        ) : null}
      </div>
      {hasPayload ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Show details
          </summary>
          {event.payload && Object.keys(event.payload).length > 0 ? (
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted/40 p-2 text-[0.7rem] leading-snug text-foreground">
              {safePrettyJson(event.payload)}
            </pre>
          ) : null}
          {event.metadata && Object.keys(event.metadata).length > 0 ? (
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted/40 p-2 text-[0.7rem] leading-snug text-foreground">
              {safePrettyJson(event.metadata)}
            </pre>
          ) : null}
        </details>
      ) : null}
    </li>
  );
}

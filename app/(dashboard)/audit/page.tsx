"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAuditEventsPage } from "@/lib/api/audit";

function truncateMiddle(v: string, keep = 4): string {
  if (!v) return v;
  if (v.length <= keep * 2 + 3) return v;
  return `${v.slice(0, keep)}...${v.slice(-keep)}`;
}

function isLikelyIdKey(k: string): boolean {
  return k === "id" || k === "userId" || k === "organizationId" || k === "aggregateId" || k.endsWith("Id");
}

function isLikelyDateKey(k: string): boolean {
  return k === "createdAt" || k.endsWith("At");
}

function formatHumanDate(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeJsonStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

function safeJsonPretty(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function cellDisplay(k: string, v: unknown): { display: string; full?: string; kind?: "id" | "payload" } {
  if (v == null) return { display: "—" };

  if (k === "payload") {
    if (typeof v === "object") {
      const compact = safeJsonStringify(v);
      const pretty = safeJsonPretty(v);
      return {
        display: compact.length > 40 ? `${compact.slice(0, 40)}…` : compact,
        full: pretty,
        kind: "payload",
      };
    }
    const s = String(v);
    return {
      display: s.length > 40 ? `${s.slice(0, 40)}…` : s,
      full: s.length > 40 ? s : undefined,
      kind: s.length > 40 ? "payload" : undefined,
    };
  }

  if (isLikelyDateKey(k)) {
    const formatted = formatHumanDate(v);
    if (formatted) return { display: formatted, full: String(v) };
  }

  const s = typeof v === "string" ? v : typeof v === "number" ? String(v) : typeof v === "boolean" ? String(v) : null;
  if (s && isLikelyIdKey(k) && s.length > 12) {
    return { display: truncateMiddle(s), full: s, kind: "id" };
  }

  if (typeof v === "object") {
    const compact = safeJsonStringify(v);
    const pretty = safeJsonPretty(v);
    return {
      display: compact.length > 40 ? `${compact.slice(0, 40)}…` : compact,
      full: pretty,
      kind: "payload",
    };
  }

  return { display: String(v) };
}

export default function AuditPage() {
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const activeCursor = cursorHistory[cursorHistory.length - 1];

  const query = useQuery({
    queryKey: ["audit", "events", activeCursor ?? "root"],
    queryFn: () => fetchAuditEventsPage({ cursor: activeCursor, limit: 30 }),
  });

  const items = query.data?.items ?? [];
  const keys = items[0] ? Object.keys(items[0]).slice(0, 10) : [];
  const next = query.data?.nextCursor;

  const onNext = () => {
    if (!next) return;
    setCursorHistory((h) => [...h, next]);
  };

  const onPrev = () => {
    setCursorHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity log</h1>
        <p className="text-sm text-muted-foreground">Audit all actions and events.</p>
      </div>

      <Card className="border-border/40 bg-card/80 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-medium">Events</CardTitle>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={cursorHistory.length <= 1} onClick={onPrev}>
              Previous page
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={!next} onClick={onNext}>
              Next page
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {query.isError ? (
            <p className="text-sm text-destructive">Could not load audit events.</p>
          ) : query.isPending ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {keys.map((k) => (
                    <TableHead key={k}>{k}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row, idx) => (
                  <TableRow key={idx}>
                    {keys.map((k) => {
                      const { display, full, kind } = cellDisplay(k, row[k]);
                      const widthClass =
                        kind === "id"
                          ? "max-w-[9rem]"
                          : k === "payload"
                            ? "max-w-[18rem]"
                            : "max-w-[14rem]";
                      return (
                        <TableCell key={k} className={`${widthClass} truncate`} title={full ? undefined : display}>
                          {full ? (
                            <TooltipProvider>
                              <UiTooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="w-full truncate text-left">
                                    {display}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px]">
                                    {full}
                                  </pre>
                                </TooltipContent>
                              </UiTooltip>
                            </TooltipProvider>
                          ) : (
                            display
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

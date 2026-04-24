"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAuditEventsPage } from "@/lib/api/audit";

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
        <p className="text-sm text-muted-foreground">Audit events from GET /audit/events (cursor pagination).</p>
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
                    {keys.map((k) => (
                      <TableCell key={k} className="max-w-[14rem] truncate" title={String(row[k] ?? "")}>
                        {String(row[k] ?? "—")}
                      </TableCell>
                    ))}
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

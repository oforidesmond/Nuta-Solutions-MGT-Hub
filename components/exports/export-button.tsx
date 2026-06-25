"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EXPORT_ROW_CAP } from "@/lib/exports/constants";
import { downloadTextFile, rowsToCsv } from "@/lib/utils/csv";

export type ExportColumn = {
  key: string;
  header: string;
};

export type ExportRowsResult = {
  rows: Record<string, unknown>[];
  truncated?: boolean;
};

type Props = {
  filename: string;
  columns: ExportColumn[];
  getRows: () => Promise<ExportRowsResult | Record<string, unknown>[]>;
  disabled?: boolean;
  label?: string;
  className?: string;
  title?: string;
};

export function ExportButton({
  filename,
  columns,
  getRows,
  disabled,
  label = "Export",
  className,
  title,
}: Props) {
  const [progress, setProgress] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      setProgress("Preparing…");
      const result = await getRows();
      const rows = Array.isArray(result) ? result : result.rows;
      const truncated = Array.isArray(result) ? false : Boolean(result.truncated);
      if (rows.length === 0) {
        throw new Error("Nothing to export for the current filters.");
      }
      const csv = rowsToCsv(rows, columns);
      downloadTextFile(csv, filename);
      return { truncated, count: rows.length };
    },
    onSuccess: ({ truncated, count }) => {
      setProgress(null);
      toast.success("CSV download started.");
      if (truncated) {
        toast.warning(
          `Export capped at ${EXPORT_ROW_CAP.toLocaleString()} rows (${count.toLocaleString()} exported). Narrow your filters for a full export.`,
        );
      }
    },
    onError: (err: unknown) => {
      setProgress(null);
      const msg = err instanceof Error ? err.message : "Export failed.";
      toast.error(msg);
    },
  });

  const busy = mutation.isPending;
  const tooltip =
    title ??
    `Download CSV (up to ${EXPORT_ROW_CAP.toLocaleString()} rows for large lists).`;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className ?? "min-h-9 gap-1.5"}
      disabled={disabled || busy}
      title={tooltip}
      onClick={() => mutation.mutate()}
    >
      <Download className="size-4" aria-hidden />
      {busy ? progress ?? "Exporting…" : label}
    </Button>
  );
}

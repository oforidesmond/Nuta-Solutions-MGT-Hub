import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  asJsonObject,
  readAmountFromJson,
  readStringFromJson,
  syncFailurePersonLabel,
} from "@/components/platform/sync-failures/presentation";
import { SyncFailureStatusBadge } from "@/components/platform/sync-failures/status-badge";
import { formatCurrency, formatDate, toNumericAmount } from "@/lib/format";
import type { PlatformSyncFailure } from "@/lib/types/platform";

export function SyncFailuresTable({
  rows,
  onSelect,
}: {
  rows: PlatformSyncFailure[];
  onSelect: (failure: PlatformSyncFailure) => void;
}) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border/40 bg-card md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="px-4">Organization</TableHead>
            <TableHead>Staff user</TableHead>
            <TableHead>Error code</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Receipt / total</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="pr-4">Resolved</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((failure) => (
            <TableRow
              key={failure.id}
              className="cursor-pointer"
              onClick={() => onSelect(failure)}
            >
              <TableCell className="px-4 py-3">
                <p className="font-medium text-foreground">
                  {failure.organization?.name ?? failure.organizationId}
                </p>
                <p className="font-mono text-xs text-muted-foreground">{failure.id}</p>
              </TableCell>
              <TableCell>
                <p className="font-medium text-foreground">
                  {syncFailurePersonLabel(failure.staffUser ?? failure.user, failure.staffUserId)}
                </p>
                <p className="font-mono text-xs text-muted-foreground">{failure.staffUserId}</p>
              </TableCell>
              <TableCell className="font-mono text-xs">
                {failure.errorCode ?? "—"}
              </TableCell>
              <TableCell>
                <SyncFailureStatusBadge status={failure.status} />
              </TableCell>
              <TableCell>
                <p className="font-medium text-foreground">{failure.entityType}</p>
                <p className="font-mono text-xs text-muted-foreground">{failure.entityId}</p>
              </TableCell>
              <TableCell>
                <p className="text-foreground">{receiptNumber(failure) ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{totalAmountLabel(failure)}</p>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatDate(failure.createdAt)}
              </TableCell>
              <TableCell className="pr-4 text-xs text-muted-foreground">
                {formatDate(failure.resolvedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function receiptNumber(failure: PlatformSyncFailure): string | null {
  const summary = failure.requestSummary ?? null;
  const payload = asJsonObject(failure.requestPayload);
  return (
    readStringFromJson(summary, [
      "receiptNumber",
      "receiptNumberMobile",
      "receipt_number",
      "receipt_number_mobile",
    ]) ??
    readStringFromJson(payload, [
      "receiptNumber",
      "receiptNumberMobile",
      "receipt_number",
      "receipt_number_mobile",
    ])
  );
}

function totalAmountLabel(failure: PlatformSyncFailure): string {
  const summary = failure.requestSummary ?? null;
  const payload = asJsonObject(failure.requestPayload);
  const amount =
    readAmountFromJson(summary, ["totalAmount", "total_amount", "grandTotal", "total"]) ??
    readAmountFromJson(payload, ["totalAmount", "total_amount", "grandTotal", "total"]);

  if (amount == null) return "Total unavailable";
  return formatCurrency(
    toNumericAmount(amount),
    failure.organization?.currency ?? "GHS",
  );
}

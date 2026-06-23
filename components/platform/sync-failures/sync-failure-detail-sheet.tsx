"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ResolveSyncFailureDialog } from "@/components/platform/sync-failures/resolve-sync-failure-dialog";
import {
  asJsonObject,
  discountSyncFailureGuidance,
  isDiscountSyncError,
  readAmountFromJson,
  readArrayFromJson,
  readStringFromJson,
  readSyncFailureDiscountContext,
  safePrettyJson,
  syncFailureActionLabel,
  syncFailurePersonLabel,
} from "@/components/platform/sync-failures/presentation";
import { SyncFailureStatusBadge } from "@/components/platform/sync-failures/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { handleApiError } from "@/lib/api/errors";
import { fetchPlatformSyncFailureById } from "@/lib/api/platform/sync-failures";
import { formatCurrency, formatDate, toNumericAmount } from "@/lib/format";
import type {
  JsonObject,
  PlatformSyncFailure,
  PlatformSyncFailureDetail,
  PlatformSyncFailureResolutionAction,
} from "@/lib/types/platform";

type SyncFailureLike = PlatformSyncFailureDetail | PlatformSyncFailure;

interface SyncFailureDetailSheetProps {
  failureId: string | null;
  fallbackFailure?: PlatformSyncFailure | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SyncFailureDetailSheet({
  failureId,
  fallbackFailure,
  open,
  onOpenChange,
}: SyncFailureDetailSheetProps) {
  const [dialogAction, setDialogAction] =
    useState<PlatformSyncFailureResolutionAction | null>(null);

  const detailQuery = useQuery({
    queryKey: ["platform", "sync-failures", "detail", failureId],
    queryFn: () => fetchPlatformSyncFailureById(failureId as string),
    enabled: open && Boolean(failureId),
  });

  const failure = detailQuery.data ?? fallbackFailure ?? null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Sync failure</SheetTitle>
            <SheetDescription className="font-mono text-xs">
              {failure?.id ?? "Select a failure"}
            </SheetDescription>
          </SheetHeader>

          {!failure && detailQuery.isPending ? (
            <div className="space-y-3 px-4 pb-4">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          ) : !failure && detailQuery.isError ? (
            <div className="px-4 pb-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">
                  {handleApiError(detailQuery.error)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => void detailQuery.refetch()}
                >
                  <RefreshCw className="mr-2 size-4" aria-hidden />
                  Retry
                </Button>
              </Card>
            </div>
          ) : failure ? (
            <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
              <SyncFailureDetailBody
                failure={failure}
                isRefreshing={detailQuery.isFetching}
                onActionSelect={setDialogAction}
              />
            </ScrollArea>
          ) : null}
        </SheetContent>
      </Sheet>

      {failure && dialogAction ? (
        <ResolveSyncFailureDialog
          failure={failure as PlatformSyncFailureDetail}
          action={dialogAction}
          open={dialogAction !== null}
          onOpenChange={(next) => {
            if (!next) setDialogAction(null);
          }}
          onResolved={() => {
            setDialogAction(null);
          }}
        />
      ) : null}
    </>
  );
}

function SyncFailureDetailBody({
  failure,
  isRefreshing,
  onActionSelect,
}: {
  failure: SyncFailureLike;
  isRefreshing: boolean;
  onActionSelect: (action: PlatformSyncFailureResolutionAction) => void;
}) {
  const summaryObject = useMemo(
    () => (failure.requestSummary ?? null) as JsonObject | null,
    [failure.requestSummary],
  );
  const payloadObject = useMemo(
    () => asJsonObject(failure.requestPayload),
    [failure.requestPayload],
  );

  const receiptNumber =
    readStringFromJson(summaryObject, [
      "receiptNumber",
      "receiptNumberMobile",
      "receipt_number",
      "receipt_number_mobile",
    ]) ??
    readStringFromJson(payloadObject, [
      "receiptNumber",
      "receiptNumberMobile",
      "receipt_number",
      "receipt_number_mobile",
    ]);

  const soldAt =
    readStringFromJson(summaryObject, ["soldAt", "sold_at"]) ??
    readStringFromJson(payloadObject, ["soldAt", "sold_at"]);

  const totalAmount =
    readAmountFromJson(summaryObject, ["totalAmount", "total_amount", "grandTotal", "total"]) ??
    readAmountFromJson(payloadObject, ["totalAmount", "total_amount", "grandTotal", "total"]);

  const items =
    readArrayFromJson(summaryObject, ["items", "lines"]) ??
    readArrayFromJson(payloadObject, ["items", "lines"]);

  const discountContext = useMemo(
    () => readSyncFailureDiscountContext(summaryObject, payloadObject),
    [summaryObject, payloadObject],
  );

  const isDiscountFailure = isDiscountSyncError(failure.errorCode);

  const staff = failure.staffUser ?? failure.user ?? null;
  const currency = failure.organization?.currency ?? "GHS";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SyncFailureStatusBadge status={failure.status} />
        <span className="rounded-full border border-border/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {failure.entityType}
        </span>
        {isRefreshing ? (
          <span className="text-xs text-muted-foreground">Refreshing detail…</span>
        ) : null}
      </div>

      {failure.status === "OPEN" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resolution actions</CardTitle>
            {isDiscountFailure ? (
              <p className="text-xs text-muted-foreground">
                {discountSyncFailureGuidance(failure.errorCode)}
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => onActionSelect("RETRY")}>
              Retry
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onActionSelect("IGNORE_CLEAR")}
            >
              Ignore and clear
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onActionSelect("FIX_AND_APPLY")}
            >
              Fix and apply
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isDiscountFailure ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Discount context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetadataItem label="Discount amount">
                {discountContext.discountAmount != null
                  ? formatCurrency(
                      toNumericAmount(discountContext.discountAmount),
                      currency,
                    )
                  : "-"}
              </MetadataItem>
              <MetadataItem label="Subtotal">
                {discountContext.subtotal != null
                  ? formatCurrency(toNumericAmount(discountContext.subtotal), currency)
                  : "-"}
              </MetadataItem>
              <MetadataItem label="Applied discount %">
                {discountContext.discountPercentApplied != null
                  ? `${Math.round(discountContext.discountPercentApplied * 100) / 100}%`
                  : "-"}
              </MetadataItem>
              <MetadataItem label="Total in payload">
                {discountContext.totalAmount != null
                  ? formatCurrency(toNumericAmount(discountContext.totalAmount), currency)
                  : "-"}
              </MetadataItem>
            </div>
            <p className="text-xs text-muted-foreground">
              Enforcement uses the staff member&apos;s current cap at sync time, which may differ
              from limits cached on the device when the sale was taken offline.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Request summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetadataItem label="Receipt number">
              <InlineValueWithCopy value={receiptNumber} emptyLabel="-" />
            </MetadataItem>
            <MetadataItem label="Total amount">
              {totalAmount != null
                ? formatCurrency(toNumericAmount(totalAmount), currency)
                : "-"}
            </MetadataItem>
            <MetadataItem label="Sold at">{formatDate(soldAt)}</MetadataItem>
            <MetadataItem label="Payment method">
              {readStringFromJson(summaryObject, ["paymentMethod", "payment_method"]) ??
                readStringFromJson(payloadObject, ["paymentMethod", "payment_method"]) ??
                "-"}
            </MetadataItem>
          </div>

          {items && items.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Items
              </p>
              <ul className="space-y-2">
                {items.map((item, index) => (
                  <li
                    key={itemKey(item, index)}
                    className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
                  >
                    <p className="font-medium text-foreground">{itemName(item)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Qty: {itemQuantity(item)} · Line total: {itemLineTotal(item, currency)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No summary items were returned. Use the full request payload below to inspect
              the attempted sale.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Context and error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetadataItem label="Organization">
              {failure.organization?.id ? (
                <Link
                  href={`/platform/organizations/${failure.organization.id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {failure.organization.name}
                </Link>
              ) : (
                failure.organization?.name ?? failure.organizationId
              )}
            </MetadataItem>
            <MetadataItem label="Staff user">
              {staff?.id ? (
                <Link
                  href={`/platform/users/${staff.id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {syncFailurePersonLabel(staff, failure.staffUserId)}
                </Link>
              ) : (
                syncFailurePersonLabel(staff, failure.staffUserId)
              )}
            </MetadataItem>
            <MetadataItem label="Device">
              <InlineValueWithCopy
                value={failure.device?.deviceName ?? failure.deviceId ?? failure.device?.id ?? null}
                emptyLabel="-"
              />
            </MetadataItem>
            <MetadataItem label="Endpoint">
              <span className="break-all font-mono text-xs">{failure.endpoint ?? "-"}</span>
            </MetadataItem>
            <MetadataItem label="Error code">
              <InlineValueWithCopy value={failure.errorCode ?? null} emptyLabel="-" />
            </MetadataItem>
            <MetadataItem label="HTTP status">
              {failure.httpStatusCode != null ? String(failure.httpStatusCode) : "-"}
            </MetadataItem>
            <MetadataItem label="Created at">{formatDate(failure.createdAt)}</MetadataItem>
            <MetadataItem label="Entity ID">
              <InlineValueWithCopy value={failure.entityId} emptyLabel="-" />
            </MetadataItem>
          </div>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {failure.errorMessage ?? "No backend error message returned."}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Resolution metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetadataItem label="Status">
              <SyncFailureStatusBadge status={failure.status} />
            </MetadataItem>
            <MetadataItem label="Resolution action">
              {syncFailureActionLabel(failure.resolutionAction)}
            </MetadataItem>
            <MetadataItem label="Resolved by admin user">
              {failure.resolvedByAdminUser?.id ? (
                <Link
                  href={`/platform/users/${failure.resolvedByAdminUser.id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {syncFailurePersonLabel(failure.resolvedByAdminUser)}
                </Link>
              ) : (
                syncFailurePersonLabel(failure.resolvedByAdminUser)
              )}
            </MetadataItem>
            <MetadataItem label="Resolved at">{formatDate(failure.resolvedAt)}</MetadataItem>
            <MetadataItem label="Applied sale ID">
              <InlineValueWithCopy value={failure.appliedSaleId ?? null} emptyLabel="-" />
            </MetadataItem>
          </div>
          <MetadataItem label="Resolution notes">
            {failure.resolutionNotes ? (
              <p className="whitespace-pre-wrap break-words">{failure.resolutionNotes}</p>
            ) : (
              "-"
            )}
          </MetadataItem>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Full request payload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-end">
            <CopyButton
              label="Copy JSON"
              value={safePrettyJson(failure.requestPayload ?? {})}
            />
          </div>
          <pre className="max-h-[30rem] overflow-auto rounded-lg bg-zinc-950 p-3 text-[11px] text-zinc-100">
            {safePrettyJson(failure.requestPayload ?? {})}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

function MetadataItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function InlineValueWithCopy({
  value,
  emptyLabel,
}: {
  value: string | null | undefined;
  emptyLabel: string;
}) {
  if (!value) return <span>{emptyLabel}</span>;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="break-all font-mono text-xs">{value}</span>
      <CopyButton label="Copy" value={value} />
    </div>
  );
}

function CopyButton({ label, value }: { label: string; value: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        toast.success("Copied");
      }}
    >
      <Copy className="size-3.5" aria-hidden />
      {label}
    </Button>
  );
}

function itemKey(item: unknown, index: number): string {
  const obj = isRecord(item) ? item : null;
  const id = obj?.id;
  return typeof id === "string" && id ? id : `item-${index}`;
}

function itemName(item: unknown): string {
  const obj = isRecord(item) ? objOrNull(item) : null;
  if (!obj) return "Item";
  return (
    readString(obj, ["productName", "name", "product_name", "productId", "product_id"]) ??
    "Item"
  );
}

function itemQuantity(item: unknown): string {
  const obj = objOrNull(item);
  if (!obj) return "-";
  const quantity = obj.quantity;
  return typeof quantity === "number" || typeof quantity === "string"
    ? String(quantity)
    : "-";
}

function itemLineTotal(item: unknown, currency: string): string {
  const obj = objOrNull(item);
  if (!obj) return "-";
  const total = obj.lineTotal ?? obj.total ?? null;
  if (typeof total === "number" || typeof total === "string") {
    return formatCurrency(toNumericAmount(total), currency);
  }
  return "-";
}

function objOrNull(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(
  value: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return null;
}

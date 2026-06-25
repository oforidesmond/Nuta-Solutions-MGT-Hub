import { Skeleton } from "@/components/ui/skeleton";
import { handleApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

type Props = {
  isPending: boolean;
  isError: boolean;
  error?: unknown;
  empty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
  skeletonHeight?: string;
};

export function QueryState({
  isPending,
  isError,
  error,
  empty,
  emptyMessage = "No data for this period.",
  children,
  skeletonHeight = "h-40",
}: Props) {
  if (isPending) return <Skeleton className={cn("w-full rounded-lg", skeletonHeight)} />;
  if (isError) return <p className="text-sm text-destructive">{handleApiError(error)}</p>;
  if (empty) return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  return <>{children}</>;
}

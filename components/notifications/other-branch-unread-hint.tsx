"use client";

import { useOtherBranchUnreadSummaries } from "@/lib/hooks/use-other-branch-unread";
import { useBranchSwitcherStore } from "@/stores/branch-switcher-store";
import { cn } from "@/lib/utils";

interface OtherBranchUnreadHintProps {
  enabled?: boolean;
  className?: string;
  onBeforeOpenSwitcher?: () => void;
}

export function OtherBranchUnreadHint({
  enabled = true,
  className,
  onBeforeOpenSwitcher,
}: OtherBranchUnreadHintProps) {
  const requestOpen = useBranchSwitcherStore((s) => s.requestOpen);
  const { formattedHint, loading, isAdmin, summaries } = useOtherBranchUnreadSummaries({
    enabled,
  });

  if (!isAdmin) return null;
  if (loading) return null;
  if (!formattedHint || summaries.length === 0) return null;

  function handleClick() {
    onBeforeOpenSwitcher?.();
    requestOpen();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full text-left text-xs leading-snug text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline",
        className,
      )}
      aria-label={formattedHint}
    >
      {formattedHint}
    </button>
  );
}

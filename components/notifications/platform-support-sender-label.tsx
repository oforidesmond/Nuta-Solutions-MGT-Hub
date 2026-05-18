import { ShieldCheck } from "lucide-react";
import { PLATFORM_SUPPORT_DISPLAY_NAME } from "@/lib/notifications/platform-support-notification";
import { cn } from "@/lib/utils";

type PlatformSupportSenderLabelProps = {
  /** Compact row for toasts and tight list items. */
  variant?: "default" | "compact";
  className?: string;
};

/**
 * Official attribution for platform super-admin notifications — high-trust, Apple-style pill.
 */
export function PlatformSupportSenderLabel({
  variant = "default",
  className,
}: PlatformSupportSenderLabelProps) {
  const compact = variant === "compact";

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border",
        "border-primary/25 bg-gradient-to-r from-primary/[0.14] via-primary/[0.06] to-transparent",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]",
        "ring-1 ring-inset ring-white/10 dark:ring-white/5",
        compact ? "px-2 py-0.5" : "px-2.5 py-1",
        className,
      )}
      role="status"
      aria-label={`From ${PLATFORM_SUPPORT_DISPLAY_NAME}`}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-primary/15",
          compact ? "size-4" : "size-5",
        )}
        aria-hidden
      >
        <ShieldCheck
          className={cn("text-primary", compact ? "size-2.5" : "size-3")}
          strokeWidth={2.25}
        />
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={cn(
            "font-semibold tracking-tight text-primary",
            compact ? "text-[0.65rem]" : "text-xs",
          )}
        >
          {PLATFORM_SUPPORT_DISPLAY_NAME}
        </span>
        {!compact ? (
          <span className="mt-0.5 text-[0.6rem] font-medium uppercase tracking-[0.14em] text-primary/70">
            Official
          </span>
        ) : null}
      </span>
    </span>
  );
}

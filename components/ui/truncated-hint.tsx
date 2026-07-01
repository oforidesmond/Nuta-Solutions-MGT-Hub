"use client";

import { HoverOrTapHint } from "@/components/ui/hover-or-tap-hint";
import { cn } from "@/lib/utils";

type TruncatedHintProps = {
  text: string;
  maxLength?: number;
  className?: string;
  contentClassName?: string;
  monospace?: boolean;
};

/** Truncated preview with full text on hover (desktop) or tap (touch). */
export function TruncatedHint({
  text,
  maxLength = 48,
  className,
  contentClassName,
  monospace = true,
}: TruncatedHintProps) {
  const truncated = text.length > maxLength;
  const preview = truncated ? `${text.slice(0, maxLength)}…` : text;
  const textClass = cn(
    monospace && "font-mono text-xs text-muted-foreground",
    className,
  );

  if (!truncated) {
    return <span className={textClass}>{text}</span>;
  }

  return (
    <HoverOrTapHint
      contentClassName={cn("max-w-md", contentClassName)}
      trigger={
        <button type="button" className={cn("interactive-cursor max-w-full truncate text-left", textClass)}>
          {preview}
        </button>
      }
    >
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px]">
        {text}
      </pre>
    </HoverOrTapHint>
  );
}

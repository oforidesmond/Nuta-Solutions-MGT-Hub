"use client";

import * as React from "react";
import { useCanHover } from "@/lib/hooks/use-can-hover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Align = "start" | "center" | "end";
type Side = "top" | "right" | "bottom" | "left";

type HoverOrTapHintProps = {
  trigger: React.ReactElement;
  children: React.ReactNode;
  contentClassName?: string;
  side?: Side;
  align?: Align;
};

/**
 * Hover tooltips on pointer devices; tap-to-toggle popovers on touch so content stays visible.
 */
export function HoverOrTapHint({
  trigger,
  children,
  contentClassName,
  side = "top",
  align = "center",
}: HoverOrTapHintProps) {
  const canHover = useCanHover();
  const [open, setOpen] = React.useState(false);

  if (canHover) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side={side} align={align} className={contentClassName}>
          {children}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent
        side={side}
        align={align}
        className={cn("w-[min(100vw-2rem,28rem)]", contentClassName)}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

"use client";

import type { LucideIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
};

export function OrgInsightDetailSheet({
  open,
  onOpenChange,
  title,
  description,
  headerAction,
  children,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[min(92vh,40rem)] flex-col gap-0 rounded-t-2xl px-0 pb-0 sm:mx-auto sm:max-w-lg sm:side-right sm:max-h-full sm:rounded-none"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25 sm:hidden" aria-hidden />
        <SheetHeader className="space-y-2 border-b border-border/40 px-4 pb-4 pt-2 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <SheetTitle>{title}</SheetTitle>
              {description ? <SheetDescription>{description}</SheetDescription> : null}
            </div>
            {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
          </div>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1 px-4 py-4">{children}</ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

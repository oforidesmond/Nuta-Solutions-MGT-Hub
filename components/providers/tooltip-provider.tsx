"use client";

import { TooltipProvider } from "@/components/ui/tooltip";

export function HubTooltipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipProvider delayDuration={400}>{children}</TooltipProvider>;
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LoginShellProps = {
  children: ReactNode;
  className?: string;
};

/** Full-viewport auth canvas - soft depth, glass panel host (DESIGN_LANGUAGE). */
export function LoginShell({ children, className }: LoginShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#f5f5f7] px-4 py-12 dark:bg-[#000000]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.18),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(0,0,0,0.04),transparent)] dark:bg-[radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(255,255,255,0.06),transparent)]"
      />
      <main
        className={cn(
          "relative z-10 w-full max-w-[26rem] rounded-2xl border border-black/[0.06] bg-white/80 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/[0.08] dark:bg-[#1c1c1e]/85 dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)]",
          className,
        )}
      >
        {children}
      </main>
    </div>
  );
}

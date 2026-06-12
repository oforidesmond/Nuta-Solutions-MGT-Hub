"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Shield } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { PlatformSidebar } from "@/components/platform/platform-sidebar";
import { useAuthStore } from "@/stores/auth-store";

export function PlatformHeader() {
  const [navOpen, setNavOpen] = useState(false);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const accountLabel =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.email ||
    "Account";

  return (
    <header
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border/30 px-4 md:px-6
        bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55"
    >
      <div className="flex items-center gap-3">
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open menu"
            onClick={() => setNavOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <SheetContent
            side="left"
            className="gap-0 overflow-hidden p-0 data-[side=left]:w-64"
          >
            <PlatformSidebar onNavigate={() => setNavOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden size-7 items-center justify-center rounded-md bg-primary/10 text-primary md:flex">
            <Shield className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              Platform Console
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.role ? user.role.replace(/_/g, " ") : "SUPER ADMIN"}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "max-w-[12rem] truncate",
            )}
          >
            {accountLabel}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => {
                clearSession();
                router.replace("/login");
              }}
            >
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

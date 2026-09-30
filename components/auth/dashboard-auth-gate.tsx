"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppNavigate } from "@/lib/hooks/use-app-navigate";
import { isPlatformAdmin } from "@/lib/platform-access";

export function DashboardAuthGate({ children }: { children: React.ReactNode }) {
  const { replace } = useAppNavigate();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (status === "unauthenticated") {
      replace("/login");
      return;
    }
    if (status === "authenticated" && isPlatformAdmin(user)) {
      replace("/platform");
    }
  }, [replace, status, user]);

  if (status === "hydrating" || status === "idle") {
    return (
      <div className="flex min-h-screen flex-col gap-4 p-8">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-64 flex-1 rounded-xl" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (isPlatformAdmin(user)) {
    return null;
  }

  return children;
}

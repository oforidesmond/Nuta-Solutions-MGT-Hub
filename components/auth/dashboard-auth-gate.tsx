"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { isPlatformAdmin } from "@/lib/platform-access";

export function DashboardAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && isPlatformAdmin(user)) {
      router.replace("/platform");
    }
  }, [router, status, user]);

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

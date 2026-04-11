"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (pathname?.startsWith("/auth/callback")) return;
    if (status !== "idle") return;
    void bootstrap();
  }, [bootstrap, pathname, status]);

  return children;
}

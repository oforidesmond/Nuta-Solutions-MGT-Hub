"use client";

import { useNavigationLoading } from "@/components/loading/navigation-loading-provider";

/**
 * Imperative navigation that arms the global Lottie overlay for route transitions.
 * Prefer this over raw `router.push` / `router.replace` for user-facing navigations.
 */
export function useAppNavigate() {
  const { navigate, replace, start, stop, pending, visible } =
    useNavigationLoading();

  return { navigate, replace, start, stop, pending, visible };
}

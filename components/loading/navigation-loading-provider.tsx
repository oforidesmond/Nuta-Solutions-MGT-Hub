"use client";

import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GlobalLoadingOverlay } from "@/components/loading/global-loading-overlay";

const SHOW_DELAY_MS = 150;
const MIN_VISIBLE_MS = 300;
const SAFETY_TIMEOUT_MS = 10_000;

type NavigationLoadingContextValue = {
  visible: boolean;
  pending: boolean;
  start: (href?: string) => void;
  stop: () => void;
  navigate: (href: string) => void;
  replace: (href: string) => void;
};

const NavigationLoadingContext =
  createContext<NavigationLoadingContextValue | null>(null);

function normalizePath(pathname: string, search: string) {
  return `${pathname}${search}`;
}

function resolveHref(href: string): URL | null {
  try {
    return new URL(href, window.location.href);
  } catch {
    return null;
  }
}

function isSameDocumentUrl(url: URL) {
  return (
    url.origin === window.location.origin &&
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  );
}

function getInternalNavAnchor(event: MouseEvent): HTMLAnchorElement | null {
  if (event.defaultPrevented) return null;
  if (event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }

  const target = event.target;
  if (!(target instanceof Element)) return null;

  const anchor = target.closest("a");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.hasAttribute("download")) return null;
  if (anchor.target && anchor.target !== "_self") return null;

  const rawHref = anchor.getAttribute("href");
  if (!rawHref || rawHref.startsWith("#")) return null;
  if (rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) return null;

  const url = resolveHref(rawHref);
  if (!url || url.origin !== window.location.origin) return null;
  if (isSameDocumentUrl(url)) return null;

  return anchor;
}

function NavigationSettleListener({
  onSettled,
}: {
  onSettled: (routeKey: string) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : "";
  const routeKey = normalizePath(pathname ?? "/", search);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  useEffect(() => {
    onSettledRef.current(routeKey);
  }, [routeKey]);

  return null;
}

export function NavigationLoadingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);

  const pendingRef = useRef(false);
  const visibleRef = useRef(false);
  const shownAtRef = useRef<number | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);
  const skipNextSettleRef = useRef(true);

  const clearTimers = useCallback(() => {
    if (showTimerRef.current != null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (safetyTimerRef.current != null) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (!pendingRef.current && !visibleRef.current) {
      clearTimers();
      return;
    }

    const finishHide = () => {
      pendingRef.current = false;
      visibleRef.current = false;
      shownAtRef.current = null;
      setPending(false);
      setVisible(false);
      clearTimers();
    };

    pendingRef.current = false;
    setPending(false);

    if (showTimerRef.current != null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }

    if (!visibleRef.current) {
      finishHide();
      return;
    }

    const shownAt = shownAtRef.current ?? Date.now();
    const elapsed = Date.now() - shownAt;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(finishHide, remaining);
  }, [clearTimers]);

  const start = useCallback(
    (href?: string) => {
      if (href) {
        const url = resolveHref(href);
        if (url && isSameDocumentUrl(url)) return;
      }

      clearTimers();
      pendingRef.current = true;
      setPending(true);

      showTimerRef.current = window.setTimeout(() => {
        if (!pendingRef.current) return;
        visibleRef.current = true;
        shownAtRef.current = Date.now();
        setVisible(true);
      }, SHOW_DELAY_MS);

      safetyTimerRef.current = window.setTimeout(() => {
        stop();
      }, SAFETY_TIMEOUT_MS);
    },
    [clearTimers, stop],
  );

  const navigate = useCallback(
    (href: string) => {
      start(href);
      router.push(href);
    },
    [router, start],
  );

  const replace = useCallback(
    (href: string) => {
      start(href);
      router.replace(href);
    },
    [router, start],
  );

  const onSettled = useCallback(
    (_routeKey: string) => {
      if (skipNextSettleRef.current) {
        skipNextSettleRef.current = false;
        return;
      }
      if (!pendingRef.current) return;
      // Any settled route ends the overlay (covers redirects and superseded navigations).
      stop();
    },
    [stop],
  );

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = getInternalNavAnchor(event);
      if (!anchor) return;
      start(anchor.href);
    };

    const onPopState = () => {
      start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [start]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const value = useMemo<NavigationLoadingContextValue>(
    () => ({
      visible,
      pending,
      start,
      stop,
      navigate,
      replace,
    }),
    [visible, pending, start, stop, navigate, replace],
  );

  return (
    <NavigationLoadingContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <NavigationSettleListener onSettled={onSettled} />
      </Suspense>
      <GlobalLoadingOverlay visible={visible} />
    </NavigationLoadingContext.Provider>
  );
}

export function useNavigationLoading() {
  const ctx = useContext(NavigationLoadingContext);
  if (!ctx) {
    throw new Error(
      "useNavigationLoading must be used within NavigationLoadingProvider",
    );
  }
  return ctx;
}

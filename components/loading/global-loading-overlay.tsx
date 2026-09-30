"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LottieSvg } from "lottie-react";
import animationData from "@/public/lottie/nav-loader.json";
import { cn } from "@/lib/utils";

const FADE_MS = 180;

type GlobalLoadingOverlayProps = {
  visible: boolean;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return reduced;
}

export function GlobalLoadingOverlay({ visible }: GlobalLoadingOverlayProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [opaque, setOpaque] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setOpaque(true));
      });
      return () => cancelAnimationFrame(id);
    }

    setOpaque(false);
    const timeout = window.setTimeout(() => setRendered(false), FADE_MS);
    return () => window.clearTimeout(timeout);
  }, [visible]);

  useEffect(() => {
    if (!rendered) return;
    document.body.setAttribute("aria-busy", "true");
    return () => {
      document.body.removeAttribute("aria-busy");
    };
  }, [rendered]);

  if (!mounted || !rendered) return null;

  return createPortal(
    <div
      className={cn(
        "pointer-events-auto fixed inset-0 z-60 flex items-center justify-center",
        "bg-background/50 backdrop-blur-sm transition-opacity ease-out",
        opaque ? "opacity-100" : "opacity-0",
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="sr-only">Loading</span>
      <div className="flex size-24 items-center justify-center" aria-hidden>
        {reducedMotion ? (
          <div className="size-10 animate-pulse rounded-md bg-primary" />
        ) : (
          <LottieSvg
            src={animationData}
            loop
            autoplay
            className="size-20"
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

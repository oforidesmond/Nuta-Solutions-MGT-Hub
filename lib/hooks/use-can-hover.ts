"use client";

import { useSyncExternalStore } from "react";

const HOVER_MEDIA = "(hover: hover) and (pointer: fine)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(HOVER_MEDIA);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(HOVER_MEDIA).matches;
}

function getServerSnapshot() {
  return true;
}

/** True when the primary input supports hover (mouse/trackpad), not touch-only. */
export function useCanHover() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

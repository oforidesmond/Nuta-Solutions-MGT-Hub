"use client";

import { useEffect, useState } from "react";
import { fetchOrgUsers } from "@/lib/api/users";
import type { HubUser } from "@/lib/types/domain";

/** Map `userId` → display label for reliability tables. */
export function useOrgUserLabels(): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const users = await fetchOrgUsers();
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const u of users as HubUser[]) {
          const label =
            [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email || u.id;
          next[u.id] = label;
        }
        setMap(next);
      } catch {
        if (!cancelled) setMap({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return map;
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchTemporaryItems } from "@/lib/api/products";
import type { HubTemporaryItem } from "@/lib/types/phase2";

export function useTemporaryItems() {
  const [items, setItems] = useState<HubTemporaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTemporaryItems();
      setItems(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}

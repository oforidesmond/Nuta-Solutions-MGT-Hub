"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { fetchOrganizationsPage } from "@/lib/api/platform/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface OrgFilterPickerProps {
  /** Selected organization id, or undefined when not filtering */
  organizationId: string | undefined;
  onOrganizationIdChange: (next: string | undefined) => void;
}

/**
 * Debounced organization search scoped to platform list endpoint; clears when empty.
 */
export function OrgFilterPicker({
  organizationId,
  onOrganizationIdChange,
}: OrgFilterPickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const searchQuery = useQuery({
    queryKey: ["platform", "organizations", "pick", debouncedQuery],
    queryFn: () =>
      fetchOrganizationsPage({
        search: debouncedQuery || undefined,
        limit: 8,
        page: 1,
      }),
    enabled: focused && debouncedQuery.length > 0,
    placeholderData: keepPreviousData,
  });

  return (
    <div className="relative space-y-1">
      <label htmlFor="org-filter-search" className="text-xs text-muted-foreground">
        Filter by organization
      </label>
      {organizationId ? (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="max-w-full truncate font-mono text-[0.7rem]">
            {organizationId}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Clear organization filter"
            onClick={() => {
              onOrganizationIdChange(undefined);
              setQuery("");
              setDebouncedQuery("");
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="org-filter-search"
              type="search"
              placeholder="Search org name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                window.setTimeout(() => setFocused(false), 180);
              }}
              className="pl-9"
              autoComplete="off"
            />
          </div>
          {focused && debouncedQuery.length > 0 && (searchQuery.data?.data?.length ?? 0) > 0 ? (
            <ul
              role="listbox"
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-card py-1 text-sm shadow-lg"
            >
              {(searchQuery.data?.data ?? []).map((org) => (
                <li key={org.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected="false"
                      className="flex w-full flex-col px-3 py-2 text-left hover:bg-muted/60"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onOrganizationIdChange(org.id);
                      setQuery("");
                      setDebouncedQuery("");
                      setFocused(false);
                    }}
                  >
                    <span className="font-medium">{org.name}</span>
                    <span className="text-xs text-muted-foreground">{org.email ?? org.id}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
      {organizationId ? null : (
        <p className="text-[0.7rem] text-muted-foreground">
          Or browse{" "}
          <Link href="/platform/organizations" className="text-primary underline-offset-4 hover:underline">
            organizations
          </Link>
        </p>
      )}
    </div>
  );
}

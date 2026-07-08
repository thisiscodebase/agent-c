"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import type { ConnectorSummary } from "#shared/types/connector";
import { queryKeys } from "~/lib/query-keys";

/**
 * Loads connector summaries and handles the OAuth return query (`?connected=`).
 *
 * Calls `useSearchParams()`, so the component tree that renders this hook
 * must be wrapped in a `<Suspense>` boundary per Next.js App Router rules.
 */
export function useConnectors() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = useQuery({
    queryKey: queryKeys.connectors,
    queryFn: () => fetch("/api/connectors").then((r) => r.json() as Promise<ConnectorSummary[]>),
  });

  const isInitialLoad = query.isLoading && !query.data;

  const connectedId = searchParams.get("connected");
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!connectedId || handledRef.current === connectedId) return;
    handledRef.current = connectedId;

    void query.refetch().then(() => {
      router.replace(pathname);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedId]);

  return {
    connectors: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
    isInitialLoad,
  };
}

"use client";

import { useQuery } from "@tanstack/react-query";
import type { UsageMeterSnapshot } from "#shared/types/usage-meter";
import { queryKeys } from "~/lib/query-keys";

interface UsageMeterResponse {
  meter: UsageMeterSnapshot;
}

export function useUsageMeter(enabled = true) {
  return useQuery({
    queryKey: queryKeys.usageMeter,
    enabled,
    queryFn: async () => {
      const res = await fetch("/api/usage/meter");
      if (!res.ok) {
        throw new Error("Failed to load usage meter");
      }
      return res.json() as Promise<UsageMeterResponse>;
    },
    staleTime: 30_000,
  });
}

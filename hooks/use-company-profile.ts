"use client";

import { useQuery } from "@tanstack/react-query";
import type { CompanyProfile } from "#shared/types/usage-stats";
import { queryKeys } from "~/lib/query-keys";

interface CompanyResponse {
  company: CompanyProfile;
}

export function useCompanyProfile() {
  return useQuery({
    queryKey: queryKeys.company,
    queryFn: async () => {
      const res = await fetch("/api/company");
      if (!res.ok) {
        throw new Error("Failed to load company profile");
      }
      return res.json() as Promise<CompanyResponse>;
    },
  });
}

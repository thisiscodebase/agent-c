"use client";

import { useQuery } from "@tanstack/react-query";
import type { PublicUserProfile } from "#shared/types/usage-stats";
import { queryKeys } from "~/lib/query-keys";

interface PublicProfileResponse {
  profile: PublicUserProfile;
}

export function usePublicProfile(handle: string) {
  return useQuery({
    queryKey: queryKeys.publicProfile(handle),
    queryFn: async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(handle)}`);
      if (!res.ok) {
        throw new Error(res.status === 404 ? "User not found" : "Failed to load profile");
      }
      return res.json() as Promise<PublicProfileResponse>;
    },
    enabled: handle.length > 0,
  });
}

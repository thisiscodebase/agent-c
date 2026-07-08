"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserProfilePatch, UserProfileWithUser } from "#shared/types/profile";
import { TIMEZONE_OPTIONS } from "#shared/timezones";
import { queryKeys } from "~/lib/query-keys";

interface ProfileResponse {
  profile: UserProfileWithUser;
}

const LOCALES = [
  { value: "en", label: "English", description: "en" },
  { value: "fr", label: "French", description: "fr" },
];

export function useProfile() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => fetch("/api/profile").then((r) => r.json() as Promise<ProfileResponse>),
  });

  const saveMutation = useMutation({
    mutationFn: async (patch: UserProfilePatch) => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      return res.json() as Promise<ProfileResponse>;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.profile, result);
    },
  });

  return {
    profile: query.data?.profile,
    isLoading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
    saveProfile: (patch: UserProfilePatch) => saveMutation.mutateAsync(patch),
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
    timezones: TIMEZONE_OPTIONS,
    locales: LOCALES,
  };
}

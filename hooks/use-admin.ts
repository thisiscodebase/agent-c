"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdminCompanyProfile, AdminUserDetail } from "#shared/types/usage-stats";
import { queryKeys } from "~/lib/query-keys";

interface AdminCompanyResponse {
  company: AdminCompanyProfile;
}

interface AdminUserResponse {
  user: AdminUserDetail;
}

export function useAdminAccess() {
  return useQuery({
    queryKey: queryKeys.adminAccess,
    queryFn: async () => {
      const res = await fetch("/api/admin/access");
      if (!res.ok) {
        throw new Error("Failed to check admin access");
      }
      return res.json() as Promise<{ allowed: boolean }>;
    },
    staleTime: 60_000,
  });
}

export function useAdminCompanyProfile(enabled = true) {
  return useQuery({
    queryKey: queryKeys.adminCompany,
    enabled,
    queryFn: async () => {
      const res = await fetch("/api/admin/company");
      if (res.status === 403) {
        throw new Error("Admin access required");
      }
      if (!res.ok) {
        throw new Error("Failed to load admin dashboard");
      }
      return res.json() as Promise<AdminCompanyResponse>;
    },
  });
}

export function useAdminUserDetail(handle: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.adminUser(handle),
    enabled: enabled && handle.length > 0,
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(handle)}`);
      if (res.status === 403) {
        throw new Error("Admin access required");
      }
      if (res.status === 404) {
        throw new Error("User not found");
      }
      if (!res.ok) {
        throw new Error("Failed to load admin user detail");
      }
      return res.json() as Promise<AdminUserResponse>;
    },
  });
}

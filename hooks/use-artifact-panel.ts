"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export const ARTIFACT_SEARCH_PARAM = "artifact";

/**
 * Panel open state lives in the URL so it survives reload and works with
 * back/forward, rather than in component state.
 */
export function useArtifactPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const openArtifactId = searchParams.get(ARTIFACT_SEARCH_PARAM) ?? undefined;

  const navigate = useCallback(
    (id: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set(ARTIFACT_SEARCH_PARAM, id);
      }
      else {
        params.delete(ARTIFACT_SEARCH_PARAM);
      }

      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openArtifact = useCallback((id: string) => navigate(id), [navigate]);
  const closeArtifact = useCallback(() => navigate(undefined), [navigate]);

  return { openArtifactId, openArtifact, closeArtifact };
}

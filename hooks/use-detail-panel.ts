"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  isComposerRefService,
  type ComposerRefService,
} from "#shared/composer-refs";

export const ARTIFACT_SEARCH_PARAM = "artifact";
export const SKILL_SEARCH_PARAM = "skill";
export const REF_SEARCH_PARAM = "ref";
export const REF_NAME_SEARCH_PARAM = "refName";

export type DetailPanel =
  | { type: "artifact"; id: string }
  | { type: "skill"; id: string }
  | {
      type: "ref";
      service: ComposerRefService;
      id: string;
      name?: string;
    };

function encodeRefParam(service: ComposerRefService, id: string): string {
  return `${service}:${id}`;
}

function parseRefParam(value: string): {
  service: ComposerRefService;
  id: string;
} | null {
  const colon = value.indexOf(":");
  if (colon <= 0) return null;
  const service = value.slice(0, colon);
  const id = value.slice(colon + 1);
  if (!isComposerRefService(service) || !id) return null;
  return { service, id };
}

/**
 * Docked detail panel state in the URL (artifact / skill / Drive·Notion ref).
 * Only one panel type is open at a time; survives reload and back/forward.
 */
export function useDetailPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const panel = useMemo((): DetailPanel | undefined => {
    const artifactId = searchParams.get(ARTIFACT_SEARCH_PARAM);
    if (artifactId) return { type: "artifact", id: artifactId };

    const skillId = searchParams.get(SKILL_SEARCH_PARAM);
    if (skillId) return { type: "skill", id: skillId };

    const refRaw = searchParams.get(REF_SEARCH_PARAM);
    if (refRaw) {
      const parsed = parseRefParam(refRaw);
      if (parsed) {
        const name = searchParams.get(REF_NAME_SEARCH_PARAM) ?? undefined;
        return { type: "ref", ...parsed, name };
      }
    }

    return undefined;
  }, [searchParams]);

  const navigate = useCallback(
    (next: DetailPanel | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(ARTIFACT_SEARCH_PARAM);
      params.delete(SKILL_SEARCH_PARAM);
      params.delete(REF_SEARCH_PARAM);
      params.delete(REF_NAME_SEARCH_PARAM);

      if (next?.type === "artifact") {
        params.set(ARTIFACT_SEARCH_PARAM, next.id);
      } else if (next?.type === "skill") {
        params.set(SKILL_SEARCH_PARAM, next.id);
      } else if (next?.type === "ref") {
        params.set(REF_SEARCH_PARAM, encodeRefParam(next.service, next.id));
        if (next.name) params.set(REF_NAME_SEARCH_PARAM, next.name);
      }

      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openArtifact = useCallback(
    (id: string) => navigate({ type: "artifact", id }),
    [navigate],
  );
  const openSkill = useCallback(
    (id: string) => navigate({ type: "skill", id }),
    [navigate],
  );
  const openRef = useCallback(
    (service: ComposerRefService, id: string, name?: string) =>
      navigate({ type: "ref", service, id, name }),
    [navigate],
  );
  const closePanel = useCallback(() => navigate(undefined), [navigate]);

  return {
    panel,
    openArtifactId: panel?.type === "artifact" ? panel.id : undefined,
    openArtifact,
    openSkill,
    openRef,
    closePanel,
    /** @deprecated Prefer `closePanel`. */
    closeArtifact: closePanel,
  };
}

/** Backward-compatible alias used by artifact cards. */
export function useArtifactPanel() {
  return useDetailPanel();
}

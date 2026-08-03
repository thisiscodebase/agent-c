"use client";

import { useQuery } from "@tanstack/react-query";
import type { ComposerRefItem } from "#shared/composer-refs";
import type { ComposerRefService } from "#shared/composer-refs";
import { queryKeys } from "~/lib/query-keys";

export type ComposerSkillDetail = {
  id: string;
  label: string;
  description: string;
  bodyMarkdown: string;
};

export type ComposerRefDetail = ComposerRefItem & {
  bodyText?: string;
  bodyMarkdown?: string;
  bodyNote?: string;
};

async function fetchSkill(id: string): Promise<ComposerSkillDetail> {
  const response = await fetch(`/api/composer/skills/${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw new Error(
      response.status === 404 ? "Skill not found" : "Failed to load skill",
    );
  }
  const data = (await response.json()) as { skill: ComposerSkillDetail };
  return data.skill;
}

async function fetchRefDetail(
  service: ComposerRefService,
  id: string,
  name?: string,
): Promise<ComposerRefDetail> {
  const params = new URLSearchParams();
  if (name) params.set("name", name);
  const qs = params.toString();
  const response = await fetch(
    `/api/composer/refs/${encodeURIComponent(service)}/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`,
  );
  if (!response.ok) {
    throw new Error(
      response.status === 404 ? "Item not found" : "Failed to load item",
    );
  }
  const data = (await response.json()) as { item: ComposerRefDetail };
  return data.item;
}

export function useComposerSkillDetail(id: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.composerSkill(id ?? ""),
    queryFn: () => fetchSkill(id as string),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  });

  return {
    skill: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useComposerRefDetail(
  service: ComposerRefService | undefined,
  id: string | undefined,
  name?: string,
) {
  const query = useQuery({
    queryKey: queryKeys.composerRefDetail(service ?? "", id ?? ""),
    queryFn: () => fetchRefDetail(service as ComposerRefService, id as string, name),
    enabled: Boolean(service && id),
    staleTime: 60_000,
  });

  return {
    item: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

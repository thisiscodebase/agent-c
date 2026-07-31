"use client";

import { useQuery } from "@tanstack/react-query";
import type { Artifact, ArtifactSummary } from "#shared/types/artifact";
import { queryKeys } from "~/lib/query-keys";

interface ArtifactResponse {
  artifact: Artifact;
}

interface ArtifactListResponse {
  artifacts: ArtifactSummary[];
}

async function fetchArtifact(id: string): Promise<Artifact> {
  const response = await fetch(`/api/artifacts/${id}`);
  if (!response.ok) {
    throw new Error(
      response.status === 404 ? "Artifact not found" : "Failed to load artifact",
    );
  }

  const { artifact } = await response.json() as ArtifactResponse;
  return artifact;
}

export function useArtifact(id: string | undefined, initialArtifact?: Artifact) {
  const query = useQuery({
    queryKey: queryKeys.artifact(id ?? ""),
    queryFn: () => fetchArtifact(id as string),
    enabled: Boolean(id),
    initialData: initialArtifact,
  });

  return {
    artifact: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useArtifactList() {
  const query = useQuery({
    queryKey: queryKeys.artifacts,
    queryFn: () =>
      fetch("/api/artifacts").then((r) => r.json() as Promise<ArtifactListResponse>),
  });

  return {
    artifacts: query.data?.artifacts ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

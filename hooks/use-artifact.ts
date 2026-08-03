"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Artifact, ArtifactStatus, ArtifactSummary } from "#shared/types/artifact";
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

export function useUpdateArtifactStatus(artifactId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (status: ArtifactStatus) => {
      const response = await fetch(`/api/artifacts/${artifactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error("Failed to update visibility");
      }

      const { artifact } = await response.json() as ArtifactResponse;
      return artifact;
    },
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.artifact(artifactId) });
      const previous = queryClient.getQueryData<Artifact>(queryKeys.artifact(artifactId));
      if (previous) {
        queryClient.setQueryData<Artifact>(queryKeys.artifact(artifactId), {
          ...previous,
          status,
        });
      }
      return { previous };
    },
    onError: (_error, _status, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.artifact(artifactId), context.previous);
      }
    },
    onSuccess: (artifact) => {
      queryClient.setQueryData(queryKeys.artifact(artifactId), artifact);
      void queryClient.invalidateQueries({ queryKey: queryKeys.artifacts });
    },
  });
}

export function useArtifactList() {
  const query = useQuery({
    queryKey: queryKeys.artifacts,
    queryFn: async () => {
      const response = await fetch("/api/artifacts");
      if (!response.ok) {
        throw new Error("Failed to load artifacts");
      }
      return response.json() as Promise<ArtifactListResponse>;
    },
  });

  return {
    artifacts: query.data?.artifacts ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

import type { Artifact, ArtifactType } from "../../shared/types/artifact.js";
import { appOrigin, internalHeaders } from "./internal-api.js";

export async function createArtifactRemote(input: {
  userId: string;
  type: ArtifactType;
  title: string;
  contentMarkdown: string;
  metadata?: Record<string, unknown>;
}): Promise<Artifact> {
  const response = await fetch(`${appOrigin()}/api/internal/artifacts`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to create artifact: ${response.status} ${response.statusText}`);
  }

  const { artifact } = await response.json() as { artifact: Artifact };
  return artifact;
}

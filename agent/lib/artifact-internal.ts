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
    const contentType = response.headers.get("content-type") ?? "";
    let detail = response.statusText;
    if (contentType.includes("application/json")) {
      try {
        const body = await response.json() as { message?: unknown };
        if (typeof body.message === "string" && body.message.trim()) {
          detail = body.message.trim();
        }
      }
      catch {
        // keep statusText
      }
    }
    throw new Error(`Failed to create artifact: ${response.status} ${detail}`);
  }

  const { artifact } = await response.json() as { artifact: Artifact };
  return artifact;
}

import type { ResolvedModelSelection } from "../../shared/models.js";
import { buildAgentSelection } from "../../shared/models.js";
import { appOrigin, internalHeaders } from "./internal-api.js";

export async function fetchAgentModelSelection(
  userId?: string,
): Promise<ResolvedModelSelection> {
  try {
    const url = new URL("/api/internal/model-routing", appOrigin());
    if (userId) {
      url.searchParams.set("userId", userId);
    }

    const response = await fetch(url, { headers: internalHeaders() });
    if (!response.ok) {
      return buildAgentSelection("chat");
    }

    const data = (await response.json()) as ResolvedModelSelection;
    if (!data?.model || !data?.tier || !data?.gateway) {
      return buildAgentSelection("chat");
    }

    return data;
  } catch {
    return buildAgentSelection("chat");
  }
}

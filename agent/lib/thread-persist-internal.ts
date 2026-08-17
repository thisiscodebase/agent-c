import type { ThreadChannelSource } from "../../shared/types/thread.js";
import { appOrigin, internalHeaders } from "./internal-api.js";

export type PersistThreadEventsInput = {
  userId: string;
  threadId: string;
  sessionId: string;
  source: ThreadChannelSource;
  title?: string;
  events: unknown[];
};

export async function persistThreadEventsRemote(
  input: PersistThreadEventsInput,
): Promise<void> {
  const response = await fetch(`${appOrigin()}/api/internal/threads/events`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Failed to persist thread events (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }
}

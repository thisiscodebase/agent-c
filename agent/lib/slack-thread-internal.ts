import { appOrigin, internalHeaders } from "./internal-api.js";

export async function persistSlackThreadEventsRemote(input: {
  userId: string;
  threadId: string;
  sessionId: string;
  continuationToken?: string;
  title?: string;
  events: unknown[];
}): Promise<void> {
  const response = await fetch(`${appOrigin()}/api/internal/threads/events`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify({
      ...input,
      source: "slack",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to persist Slack thread events (${response.status})`);
  }
}

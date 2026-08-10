import type { UsageMeterSnapshot } from "../../shared/types/usage-meter.js";
import { appOrigin, internalHeaders } from "./internal-api.js";

export async function fetchUsageMeter(userId: string): Promise<UsageMeterSnapshot | undefined> {
  try {
    const response = await fetch(
      `${appOrigin()}/api/internal/usage/meter?userId=${encodeURIComponent(userId)}`,
      { headers: internalHeaders() },
    );
    if (!response.ok) {
      return undefined;
    }
    const data = (await response.json()) as { meter: UsageMeterSnapshot };
    return data.meter;
  } catch {
    return undefined;
  }
}

export async function recordUsageMeterRemote(input: {
  userId: string;
  eventId: string;
  costUsd: number;
  sessionId?: string;
  turnId?: string;
  stepIndex?: number;
}): Promise<void> {
  const response = await fetch(`${appOrigin()}/api/internal/usage/record`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to record usage meter (${response.status})`);
  }
}

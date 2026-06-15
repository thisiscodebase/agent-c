import type { SlackLinkRecord } from "#shared/types/slack-link";

function appOrigin() {
  const configured = process.env.BETTER_AUTH_URL?.trim().replace(/\/$/, "");
  if (configured) {
    return configured;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}

function internalHeaders() {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (!secret) {
    throw new Error("INTERNAL_API_SECRET is not configured");
  }

  return {
    authorization: `Bearer ${secret}`,
    "content-type": "application/json",
  };
}

export async function fetchSlackLinkForMember(teamId: string, userId: string) {
  const response = await fetch(
    `${appOrigin()}/api/internal/slack/link/member?teamId=${encodeURIComponent(teamId)}&userId=${encodeURIComponent(userId)}`,
    { headers: internalHeaders() },
  );

  if (!response.ok) {
    return undefined;
  }

  const body = await response.json() as { link: SlackLinkRecord | null };
  return body.link ?? undefined;
}

export async function consumeSlackLinkCodeRemote(input: {
  code: string;
  slackTeamId: string;
  slackUserId: string;
  slackUserName?: string;
  slackDisplayName?: string;
  slackEmail?: string;
}) {
  const response = await fetch(`${appOrigin()}/api/internal/slack/link/consume`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return { ok: false as const, reason: "invalid" as const };
  }

  return response.json() as Promise<
    | { ok: true; appUserId: string }
    | { ok: false; reason: "invalid" | "expired" }
  >;
}

export function parseSlackLinkCommand(text: string) {
  const match = text.match(/\blink\s+([A-Z0-9]{6})\b/i);
  return match?.[1]?.toUpperCase();
}

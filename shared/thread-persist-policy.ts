import {
  DEFAULT_SLACK_THREAD_TITLE,
  slackThreadId,
  slackThreadTitleFromMessageText,
  truncateThreadTitle,
  type ThreadChannelSource,
} from "./types/thread.ts";

/** High-frequency deltas — omit from durable mirror (final blocks still land). */
export const PERSIST_SKIPPED_EVENT_TYPES = new Set<string>([
  "message.appended",
  "reasoning.appended",
]);

/**
 * Slack leaderboard / cost mirror: enough for usage-stats aggregation.
 * Web needs a fuller stream to hydrate `useEveAgent` on resume.
 */
export const SLACK_PERSISTED_EVENT_TYPES = new Set<string>([
  "session.started",
  "turn.started",
  "message.received",
  "actions.requested",
  "step.started",
  "step.completed",
]);

export const THREAD_ID_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidWebThreadId(threadId: string): boolean {
  return THREAD_ID_UUID_RE.test(threadId);
}

export function shouldPersistEvent(
  eventType: string,
  source: ThreadChannelSource,
): boolean {
  if (PERSIST_SKIPPED_EVENT_TYPES.has(eventType)) {
    return false;
  }
  if (source === "slack") {
    return SLACK_PERSISTED_EVENT_TYPES.has(eventType);
  }
  return true;
}

export function isSlackChannelKind(
  channelKind: string | undefined,
  attributes?: Readonly<Record<string, string | readonly string[]>> | null,
): boolean {
  if (channelKind === "channel:slack" || channelKind === "slack") {
    return true;
  }
  const linked = attributes?.linked;
  const slackUserId = attributes?.slack_user_id;
  return linked === "true" && typeof slackUserId === "string" && slackUserId.length > 0;
}

export function readStringAttr(
  attrs: Readonly<Record<string, string | readonly string[]>> | undefined | null,
  key: string,
): string | undefined {
  const value = attrs?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function resolvePersistTarget(input: {
  channelKind?: string;
  sessionId: string;
  attributes?: Readonly<Record<string, string | readonly string[]>> | null;
}): { source: ThreadChannelSource; threadId: string } | null {
  if (isSlackChannelKind(input.channelKind, input.attributes)) {
    return {
      source: "slack",
      threadId: slackThreadId(input.sessionId),
    };
  }

  const threadId = readStringAttr(input.attributes, "threadId");
  if (!threadId || !isValidWebThreadId(threadId)) {
    return null;
  }

  return { source: "web", threadId };
}

export function slackPlaceholderTitle(attributes?: Readonly<
  Record<string, string | readonly string[]>
> | null): string {
  const name =
    readStringAttr(attributes, "slack_user_name")
    ?? readStringAttr(attributes, "name");
  if (!name) {
    return DEFAULT_SLACK_THREAD_TITLE;
  }
  return truncateThreadTitle(`${DEFAULT_SLACK_THREAD_TITLE} · ${name}`);
}

export function titleFromSlackMessageEvent(input: {
  eventType: string;
  messageText?: string;
  attributes?: Readonly<Record<string, string | readonly string[]>> | null;
}): string {
  if (input.eventType !== "message.received") {
    return slackPlaceholderTitle(input.attributes);
  }
  const raw = input.messageText?.trim() ?? "";
  if (!raw) {
    return slackPlaceholderTitle(input.attributes);
  }
  return slackThreadTitleFromMessageText(raw) ?? slackPlaceholderTitle(input.attributes);
}

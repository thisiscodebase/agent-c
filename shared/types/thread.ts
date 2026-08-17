import type { AgentPrefs } from "../agent-modes";

export type { AgentPrefs };

export interface ThreadSummary {
  id: string;
  title: string;
  updatedAt: number;
  createdAt: number;
}

export interface EveSessionCursor {
  sessionId?: string;
  /**
   * @deprecated Eve ≥0.31 addresses sessions by id only. Retained so older
   * Postgres rows still parse; new writes omit this field.
   */
  continuationToken?: string;
  streamIndex: number;
}

export type ThreadTitlePhase = "seed" | "refine";
export type ThreadTitleSource = "truncated" | "generated";

export interface ThreadTitleMeta {
  /** User-message count when the title was last generated for `lastPhase`. */
  lastUserCount: number;
  lastPhase: ThreadTitlePhase;
  source: ThreadTitleSource;
}

export type ThreadChannelSource = "web" | "slack";

export const SLACK_THREAD_ID_PREFIX = "slack:";
export const DEFAULT_SLACK_THREAD_TITLE = "Slack";

export interface ThreadState {
  session: EveSessionCursor;
  events: unknown[];
  titleMeta?: ThreadTitleMeta;
  /** Per-thread Zest/Juice mode + reasoning effort. */
  agentPrefs?: AgentPrefs;
  /** Originating channel. Absent / `web` is the in-app chat UI. */
  source?: ThreadChannelSource;
}

export interface ThreadRecord extends ThreadSummary {
  state: ThreadState | null;
}

/** Owner can read/write; admins may open another user's thread read-only. */
export type ThreadViewerAccess = "owner" | "admin_readonly";

export function slackThreadId(sessionId: string): string {
  return `${SLACK_THREAD_ID_PREFIX}${sessionId}`;
}

export function isSlackThreadId(id: string): boolean {
  return id.startsWith(SLACK_THREAD_ID_PREFIX);
}

function eventMetaId(event: unknown): string | null {
  if (!event || typeof event !== "object") {
    return null;
  }
  const meta = (event as { meta?: unknown }).meta;
  if (!meta || typeof meta !== "object") {
    return null;
  }
  const id = (meta as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/**
 * Append stream events onto persisted thread state, deduping by `meta.id`.
 * Used for Slack (and other non-web) channel persistence.
 */
export function appendThreadEventsState(
  existing: ThreadState | null,
  events: unknown[],
  session: {
    sessionId?: string;
    continuationToken?: string;
    streamIndex?: number;
  },
  source?: ThreadChannelSource,
): ThreadState {
  const seen = new Set<string>();
  const merged: unknown[] = [];

  for (const event of [...(existing?.events ?? []), ...events]) {
    const id = eventMetaId(event);
    if (id) {
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
    }
    merged.push(event);
  }

  return {
    session: {
      sessionId: session.sessionId ?? existing?.session.sessionId,
      continuationToken: session.continuationToken ?? existing?.session.continuationToken,
      streamIndex: Math.max(
        session.streamIndex ?? 0,
        existing?.session.streamIndex ?? 0,
        merged.length,
      ),
    },
    events: merged,
    titleMeta: existing?.titleMeta,
    agentPrefs: existing?.agentPrefs,
    source: source ?? existing?.source,
  };
}

export function truncateThreadTitle(text: string, maxLength = 60): string {
  const line = text.trim().split("\n")[0]?.trim() || "New chat";
  if (line.length <= maxLength) {
    return line;
  }

  return `${line.slice(0, maxLength - 1)}…`;
}

/**
 * Eve wraps Slack inbound text in an XML envelope. The first line is
 * `<slack_message>`; the real prompt lives inside `<content>…</content>`.
 */
export function extractSlackMessageContent(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  const match = trimmed.match(/<content>\s*([\s\S]*?)\s*<\/content>/i);
  if (match?.[1]) {
    return match[1].trim();
  }

  if (trimmed.startsWith("<slack_message>")) {
    return "";
  }

  return trimmed;
}

/** Title for a Slack-originated thread, using envelope content when present. */
export function slackThreadTitleFromMessageText(raw: string): string | undefined {
  const content = extractSlackMessageContent(raw);
  if (!content) {
    return undefined;
  }
  return truncateThreadTitle(`${DEFAULT_SLACK_THREAD_TITLE}: ${content}`);
}

/** Whether refine title generation should run for this user-message count. */
export function shouldRefineThreadTitle(
  userCount: number,
  titleMeta: ThreadTitleMeta | undefined,
): boolean {
  if (userCount < 1) {
    return false;
  }
  if (userCount !== 1 && userCount % 4 !== 0) {
    return false;
  }
  if (titleMeta?.lastPhase === "refine" && titleMeta.lastUserCount === userCount) {
    return false;
  }
  return true;
}

/** Whether seed title generation should run for this thread. */
export function shouldSeedThreadTitle(titleMeta: ThreadTitleMeta | undefined): boolean {
  return !titleMeta || titleMeta.source === "truncated";
}

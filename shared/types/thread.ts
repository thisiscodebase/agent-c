export interface ThreadSummary {
  id: string;
  title: string;
  updatedAt: number;
  createdAt: number;
}

export interface EveSessionCursor {
  sessionId?: string;
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

export interface ThreadState {
  session: EveSessionCursor;
  events: unknown[];
  titleMeta?: ThreadTitleMeta;
}

export interface ThreadRecord extends ThreadSummary {
  state: ThreadState | null;
}

export function truncateThreadTitle(text: string, maxLength = 60): string {
  const line = text.trim().split("\n")[0]?.trim() || "New chat";
  if (line.length <= maxLength) {
    return line;
  }

  return `${line.slice(0, maxLength - 1)}…`;
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

import type { ThreadRecord } from "./types/thread.ts";

/** Cursor shape expected by Eve `useEveAgent` (`ClientSessionState`). */
export type ResumeSessionCursor = {
  sessionId: string;
  streamIndex: number;
};

export type ResumeOptionsFromThread = {
  initialSession?: ResumeSessionCursor;
  initialEvents?: readonly unknown[];
};

/**
 * Build Eve resume options from a persisted Postgres thread row.
 * Session-only rows (ingest wrote sessionId before events) still attach.
 */
export function resumeOptionsFromThread(thread: ThreadRecord): ResumeOptionsFromThread {
  const events = thread.state?.events;
  const session = thread.state?.session;
  const sessionId = session?.sessionId;

  if (!events?.length) {
    if (sessionId) {
      return {
        initialSession: {
          sessionId,
          streamIndex: session?.streamIndex ?? 0,
        },
      };
    }
    return {};
  }

  if (!sessionId) {
    return {
      initialEvents: events,
    };
  }

  return {
    initialSession: {
      sessionId,
      streamIndex: Math.max(session?.streamIndex ?? 0, events.length),
    },
    initialEvents: events,
  };
}

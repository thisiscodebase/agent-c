import { and, desc, eq, like, not } from "drizzle-orm";
import { db, schema } from "~~/server/db/client";
import type { AgentPrefs } from "#shared/agent-modes";
import { normalizeAgentPrefs } from "#shared/agent-modes";
import {
  applyAgentPrefs,
  applyTitleMeta,
  mergeThreadState,
} from "#shared/thread-state-merge";
import {
  appendThreadEventsState,
  DEFAULT_SLACK_THREAD_TITLE,
  SLACK_THREAD_ID_PREFIX,
  truncateThreadTitle,
  type ThreadRecord,
  type ThreadState,
  type ThreadSummary,
  type ThreadTitleMeta,
  type ThreadViewerAccess,
} from "#shared/types/thread";
import { isAdminEmail } from "~~/server/utils/admin";
import { createError } from "~~/server/utils/http-error";

export type ThreadForViewer = {
  thread: ThreadRecord;
  access: ThreadViewerAccess;
  /** Present when `access` is `admin_readonly`. */
  ownerUserId?: string;
};

const LIST_LIMIT = 50;

function parseThreadState(value: ThreadState | null | undefined): ThreadState | null {
  if (!value || typeof value !== "object" || !Array.isArray(value.events)) {
    return null;
  }
  const agentPrefs = value.agentPrefs
    ? normalizeAgentPrefs(value.agentPrefs)
    : undefined;
  return {
    ...value,
    ...(agentPrefs ? { agentPrefs } : {}),
  };
}

function rowToSummary(row: typeof schema.threads.$inferSelect): ThreadSummary {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

function rowToRecord(row: typeof schema.threads.$inferSelect): ThreadRecord {
  return {
    ...rowToSummary(row),
    state: parseThreadState(row.state),
  };
}

export async function listThreadsForUser(userId: string): Promise<ThreadSummary[]> {
  const rows = await db.select()
    .from(schema.threads)
    .where(and(
      eq(schema.threads.userId, userId),
      not(like(schema.threads.id, `${SLACK_THREAD_ID_PREFIX}%`)),
    ))
    .orderBy(desc(schema.threads.updatedAt))
    .limit(LIST_LIMIT);

  return rows.map(rowToSummary);
}

export async function getThreadForUser(userId: string, id: string) {
  const [row] = await db.select()
    .from(schema.threads)
    .where(and(
      eq(schema.threads.id, id),
      eq(schema.threads.userId, userId),
    ))
    .limit(1);

  return row ? rowToRecord(row) : undefined;
}

export async function getThreadById(id: string) {
  const [row] = await db.select()
    .from(schema.threads)
    .where(eq(schema.threads.id, id))
    .limit(1);

  if (!row) {
    return undefined;
  }

  return {
    thread: rowToRecord(row),
    ownerUserId: row.userId,
  };
}

/**
 * Resolve a thread for the signed-in viewer: own threads as owner, or any
 * thread when the viewer is on the admin allowlist (read-only).
 */
export async function getThreadForViewer(
  userId: string,
  email: string | null | undefined,
  id: string,
): Promise<ThreadForViewer | undefined> {
  const owned = await getThreadForUser(userId, id);
  if (owned) {
    return { thread: owned, access: "owner" };
  }

  if (!isAdminEmail(email)) {
    return undefined;
  }

  const other = await getThreadById(id);
  if (!other) {
    return undefined;
  }

  return {
    thread: other.thread,
    access: "admin_readonly",
    ownerUserId: other.ownerUserId,
  };
}

export async function createThreadForUser(
  userId: string,
  input: { id?: string; title?: string; agentPrefs?: AgentPrefs },
) {
  const id = input.id ?? crypto.randomUUID();
  const title = input.title?.trim() || "New chat";
  const agentPrefs = input.agentPrefs
    ? normalizeAgentPrefs(input.agentPrefs)
    : undefined;

  await db.insert(schema.threads).values({
    id,
    userId,
    title: truncateThreadTitle(title),
    ...(agentPrefs
      ? {
          state: {
            session: { streamIndex: 0 },
            events: [],
            agentPrefs,
          } satisfies ThreadState,
        }
      : {}),
  });

  const created = await getThreadForUser(userId, id);
  if (!created) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create thread",
    });
  }

  return created;
}

export async function updateThreadForUser(
  userId: string,
  id: string,
  patch: {
    title?: string;
    state?: ThreadState;
    /** Update title cadence metadata without replacing session/events. */
    titleMeta?: ThreadTitleMeta;
    /** Update mode/reasoning without replacing session/events. */
    agentPrefs?: AgentPrefs;
  },
): Promise<
  | {
      thread: ThreadRecord;
      merge: {
        incomingEventCount: number;
        storedEventCount: number;
        keptLongerLog: boolean;
      } | null;
    }
  | undefined
> {
  const existing = await getThreadForUser(userId, id);
  if (!existing) {
    return undefined;
  }

  let nextState: ThreadState | undefined;
  let merge: {
    incomingEventCount: number;
    storedEventCount: number;
    keptLongerLog: boolean;
  } | null = null;

  if (patch.state !== undefined) {
    const storedEventCount = existing.state?.events.length ?? 0;
    const incomingEventCount = patch.state.events.length;
    nextState = mergeThreadState(existing.state, patch.state);
    merge = {
      incomingEventCount,
      storedEventCount,
      keptLongerLog: incomingEventCount < storedEventCount,
    };
  }
  if (patch.titleMeta !== undefined) {
    nextState = applyTitleMeta(nextState ?? existing.state, patch.titleMeta);
  }
  if (patch.agentPrefs !== undefined) {
    nextState = applyAgentPrefs(nextState ?? existing.state, patch.agentPrefs);
  }

  await db.update(schema.threads)
    .set({
      updatedAt: new Date(),
      ...(patch.title !== undefined ? { title: truncateThreadTitle(patch.title) } : {}),
      ...(nextState !== undefined ? { state: nextState } : {}),
    })
    .where(and(
      eq(schema.threads.id, id),
      eq(schema.threads.userId, userId),
    ));

  const thread = await getThreadForUser(userId, id);
  if (!thread) {
    return undefined;
  }
  return { thread, merge };
}

export async function deleteThreadForUser(userId: string, id: string) {
  const existing = await getThreadForUser(userId, id);
  if (!existing) {
    return false;
  }

  await db.delete(schema.threads)
    .where(and(
      eq(schema.threads.id, id),
      eq(schema.threads.userId, userId),
    ));

  return true;
}

export async function appendChannelThreadEvents(input: {
  userId: string;
  threadId: string;
  sessionId: string;
  source: "web" | "slack";
  title?: string;
  events: unknown[];
}): Promise<{ created: boolean }> {
  if (input.events.length === 0) {
    return { created: false };
  }

  const [owner] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.id, input.userId))
    .limit(1);

  if (!owner) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  const defaultTitle = input.source === "slack" ? DEFAULT_SLACK_THREAD_TITLE : "New chat";
  const title = input.title ? truncateThreadTitle(input.title) : defaultTitle;
  const emptyState = appendThreadEventsState(
    null,
    [],
    { sessionId: input.sessionId },
    input.source,
  );

  return await db.transaction(async (tx) => {
    const inserted = await tx.insert(schema.threads).values({
      id: input.threadId,
      userId: input.userId,
      title,
      state: emptyState,
    }).onConflictDoNothing().returning({ id: schema.threads.id });

    const created = inserted.length > 0;

    const [existing] = await tx
      .select()
      .from(schema.threads)
      .where(eq(schema.threads.id, input.threadId))
      .limit(1)
      .for("update");

    if (!existing) {
      throw createError({ statusCode: 500, statusMessage: "Failed to persist thread" });
    }
    if (existing.userId !== input.userId) {
      throw createError({ statusCode: 409, statusMessage: "Thread belongs to another user" });
    }

    const nextState = appendThreadEventsState(
      parseThreadState(existing.state),
      input.events,
      {
        sessionId: input.sessionId,
        streamIndex: 0,
      },
      input.source,
    );

    const replacePlaceholderTitle = input.source === "slack"
      && (
        existing.title === DEFAULT_SLACK_THREAD_TITLE
        || existing.title.startsWith(`${DEFAULT_SLACK_THREAD_TITLE} · `)
      );

    await tx.update(schema.threads)
      .set({
        updatedAt: new Date(),
        state: nextState,
        ...(replacePlaceholderTitle && input.title ? { title } : {}),
      })
      .where(and(
        eq(schema.threads.id, input.threadId),
        eq(schema.threads.userId, input.userId),
      ));

    return { created };
  });
}

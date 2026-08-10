import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "~~/server/db/client";
import type {
  ThreadRecord,
  ThreadState,
  ThreadSummary,
  ThreadTitleMeta,
  ThreadViewerAccess,
} from "#shared/types/thread";
import { truncateThreadTitle } from "#shared/types/thread";
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
  return value;
}

function mergeThreadState(existing: ThreadState | null, incoming: ThreadState): ThreadState {
  const session = incoming.session;
  const existingEvents = existing?.events ?? [];
  // Title-only writers historically sent `events: []` and could race a successful
  // persist, wiping the transcript. Never shrink the durable event log.
  const events = incoming.events.length >= existingEvents.length
    ? incoming.events
    : existingEvents;

  return {
    session: {
      sessionId: session.sessionId ?? existing?.session.sessionId,
      continuationToken: session.continuationToken ?? existing?.session.continuationToken,
      streamIndex: Math.max(session.streamIndex, existing?.session.streamIndex ?? 0),
    },
    events,
    // Preserve title metadata when clients only patch session/events.
    titleMeta: incoming.titleMeta ?? existing?.titleMeta,
  };
}

function applyTitleMeta(
  existing: ThreadState | null,
  titleMeta: ThreadTitleMeta,
): ThreadState {
  return {
    session: existing?.session ?? { streamIndex: 0 },
    events: existing?.events ?? [],
    titleMeta,
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
    .where(eq(schema.threads.userId, userId))
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
  input: { id?: string; title?: string },
) {
  const id = input.id ?? crypto.randomUUID();
  const title = input.title?.trim() || "New chat";

  await db.insert(schema.threads).values({
    id,
    userId,
    title: truncateThreadTitle(title),
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
  },
) {
  const existing = await getThreadForUser(userId, id);
  if (!existing) {
    return undefined;
  }

  let nextState: ThreadState | undefined;
  if (patch.state !== undefined) {
    nextState = mergeThreadState(existing.state, patch.state);
  }
  if (patch.titleMeta !== undefined) {
    nextState = applyTitleMeta(nextState ?? existing.state, patch.titleMeta);
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

  return getThreadForUser(userId, id);
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

import { and, eq } from "drizzle-orm";
import { db, schema } from "~~/server/db/client";
import type { ThreadFeedbackRating } from "~~/server/db/schema/threads";
import { createError } from "~~/server/utils/http-error";

export async function upsertThreadFeedbackForUser(
  userId: string,
  threadId: string,
  input: {
    rating: ThreadFeedbackRating;
    comment?: string;
    messageId?: string;
  },
) {
  const thread = await db.select({ id: schema.threads.id })
    .from(schema.threads)
    .where(and(
      eq(schema.threads.id, threadId),
      eq(schema.threads.userId, userId),
    ))
    .limit(1);

  if (!thread[0]) {
    throw createError({ statusCode: 404, statusMessage: "Thread not found" });
  }

  const comment = input.comment?.trim() || null;
  const existing = await db.select({ id: schema.threadFeedback.id })
    .from(schema.threadFeedback)
    .where(and(
      eq(schema.threadFeedback.threadId, threadId),
      eq(schema.threadFeedback.userId, userId),
    ))
    .limit(1);

  if (existing[0]) {
    const [row] = await db.update(schema.threadFeedback)
      .set({
        rating: input.rating,
        comment,
        messageId: input.messageId ?? null,
      })
      .where(eq(schema.threadFeedback.id, existing[0].id))
      .returning();

    if (!row) {
      throw createError({ statusCode: 500, statusMessage: "Failed to update feedback" });
    }
    return row;
  }

  const [row] = await db.insert(schema.threadFeedback)
    .values({
      id: crypto.randomUUID(),
      threadId,
      userId,
      rating: input.rating,
      comment,
      messageId: input.messageId ?? null,
    })
    .returning();

  if (!row) {
    throw createError({ statusCode: 500, statusMessage: "Failed to save feedback" });
  }
  return row;
}

import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "~~/server/db/client";
import {
  CHAT_ATTACHMENTS_BUCKET,
  getSupabaseAdmin,
} from "~~/server/db/supabase";
import { createError } from "~~/server/utils/http-error";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_TURN,
  resolveAttachmentMime,
  type ChatAttachmentRecord,
} from "#shared/types/attachment";

type AttachmentRow = typeof schema.chatAttachments.$inferSelect;

function rowToRecord(row: AttachmentRow, url?: string): ChatAttachmentRecord {
  return {
    id: row.id,
    threadId: row.threadId,
    filename: row.filename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    pageCount: row.pageCount,
    rowCount: row.rowCount,
    url,
    createdAt: row.createdAt.getTime(),
  };
}

function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\]/g, "_").trim() || "file";
  return base.slice(0, 180);
}

export async function assertThreadOwnedByUser(
  userId: string,
  threadId: string,
): Promise<void> {
  const [thread] = await db
    .select({ id: schema.threads.id })
    .from(schema.threads)
    .where(
      and(eq(schema.threads.id, threadId), eq(schema.threads.userId, userId)),
    )
    .limit(1);

  if (!thread) {
    throw createError({ statusCode: 404, statusMessage: "Thread not found" });
  }
}

export async function listAttachmentsForThread(
  userId: string,
  threadId: string,
): Promise<ChatAttachmentRecord[]> {
  const rows = await db
    .select()
    .from(schema.chatAttachments)
    .where(
      and(
        eq(schema.chatAttachments.userId, userId),
        eq(schema.chatAttachments.threadId, threadId),
      ),
    )
    .orderBy(desc(schema.chatAttachments.createdAt));

  return rows.map((row) => rowToRecord(row));
}

export async function getAttachmentForUser(
  userId: string,
  attachmentId: string,
): Promise<AttachmentRow | undefined> {
  const [row] = await db
    .select()
    .from(schema.chatAttachments)
    .where(
      and(
        eq(schema.chatAttachments.id, attachmentId),
        eq(schema.chatAttachments.userId, userId),
      ),
    )
    .limit(1);

  return row;
}

export async function downloadAttachmentBytes(
  row: AttachmentRow,
): Promise<Uint8Array> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .download(row.storagePath);

  if (error || !data) {
    throw createError({
      statusCode: 502,
      statusMessage: error?.message ?? "Failed to download attachment",
    });
  }

  return new Uint8Array(await data.arrayBuffer());
}

export async function createAttachmentForUser(
  userId: string,
  threadId: string,
  file: {
    filename: string;
    mimeType: string;
    bytes: Uint8Array;
  },
): Promise<ChatAttachmentRecord> {
  await assertThreadOwnedByUser(userId, threadId);

  const existing = await listAttachmentsForThread(userId, threadId);
  if (existing.length >= MAX_ATTACHMENTS_PER_TURN * 20) {
    // Soft ceiling per thread to avoid unbounded growth in a single chat.
    throw createError({
      statusCode: 400,
      statusMessage: "Too many attachments on this thread",
    });
  }

  const filename = sanitizeFilename(file.filename);
  const mime = resolveAttachmentMime(file.mimeType, filename);
  if (!mime) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unsupported file type: ${file.mimeType || filename}`,
    });
  }

  if (file.bytes.byteLength === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Empty file",
    });
  }

  if (file.bytes.byteLength > MAX_ATTACHMENT_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: `File exceeds ${MAX_ATTACHMENT_BYTES} byte limit`,
    });
  }

  const id = nanoid();
  const storagePath = `${userId}/${threadId}/${id}/${filename}`;
  const supabase = getSupabaseAdmin();

  const { error: uploadError } = await supabase.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .upload(storagePath, file.bytes, {
      contentType: mime,
      upsert: false,
    });

  if (uploadError) {
    throw createError({
      statusCode: 502,
      statusMessage: uploadError.message || "Upload to storage failed",
    });
  }

  const [row] = await db
    .insert(schema.chatAttachments)
    .values({
      id,
      userId,
      threadId,
      storagePath,
      filename,
      mimeType: mime,
      sizeBytes: file.bytes.byteLength,
    })
    .returning();

  if (!row) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to record attachment",
    });
  }

  return rowToRecord(row);
}

export async function updateAttachmentCounts(
  attachmentId: string,
  counts: { pageCount?: number; rowCount?: number },
): Promise<void> {
  await db
    .update(schema.chatAttachments)
    .set({
      ...(counts.pageCount !== undefined ? { pageCount: counts.pageCount } : {}),
      ...(counts.rowCount !== undefined ? { rowCount: counts.rowCount } : {}),
    })
    .where(eq(schema.chatAttachments.id, attachmentId));
}

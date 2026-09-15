import { NextResponse } from "next/server";
import { z } from "zod";
import {
  downloadAttachmentBytes,
  getAttachmentForUser,
  updateAttachmentCounts,
} from "~~/server/utils/attachments";
import {
  previewAttachmentContent,
  readAttachmentContent,
} from "~~/server/utils/attachment-content";
import { createError } from "~~/server/utils/http-error";
import { requireInternalRequest } from "~~/server/utils/internal-api";
import { withRoute } from "~~/server/utils/route-handler";

const previewBodySchema = z.object({
  userId: z.string().trim().min(1),
  attachmentId: z.string().trim().min(1),
});

const readBodySchema = previewBodySchema.extend({
  pageStart: z.number().int().min(1).optional(),
  pageEnd: z.number().int().min(1).optional(),
  rowStart: z.number().int().min(1).optional(),
  rowEnd: z.number().int().min(1).optional(),
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(20_000).optional(),
});

export const POST = withRoute(async (request: Request) => {
  requireInternalRequest(request);

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "read" ? "read" : "preview";
  const body = await request.json();

  if (mode === "preview") {
    const { userId, attachmentId } = previewBodySchema.parse(body);
    const row = await getAttachmentForUser(userId, attachmentId);
    if (!row) {
      throw createError({ statusCode: 404, statusMessage: "Attachment not found" });
    }

    const bytes = await downloadAttachmentBytes(row);
    const content = await previewAttachmentContent({
      filename: row.filename,
      mimeType: row.mimeType,
      bytes,
    });

    if (
      (content.pageCount != null && content.pageCount !== row.pageCount)
      || (content.rowCount != null && content.rowCount !== row.rowCount)
    ) {
      await updateAttachmentCounts(row.id, {
        pageCount: content.pageCount,
        rowCount: content.rowCount,
      });
    }

    return NextResponse.json({
      attachment: {
        id: row.id,
        threadId: row.threadId,
        filename: row.filename,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        pageCount: content.pageCount ?? row.pageCount,
        rowCount: content.rowCount ?? row.rowCount,
      },
      content,
    });
  }

  const input = readBodySchema.parse(body);
  const row = await getAttachmentForUser(input.userId, input.attachmentId);
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "Attachment not found" });
  }

  const bytes = await downloadAttachmentBytes(row);
  const content = await readAttachmentContent({
    filename: row.filename,
    mimeType: row.mimeType,
    bytes,
    pageStart: input.pageStart,
    pageEnd: input.pageEnd,
    rowStart: input.rowStart,
    rowEnd: input.rowEnd,
    offset: input.offset,
    limit: input.limit,
  });

  if (
    (content.pageCount != null && content.pageCount !== row.pageCount)
    || (content.rowCount != null && content.rowCount !== row.rowCount)
  ) {
    await updateAttachmentCounts(row.id, {
      pageCount: content.pageCount,
      rowCount: content.rowCount,
    });
  }

  return NextResponse.json({
    attachment: {
      id: row.id,
      threadId: row.threadId,
      filename: row.filename,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      pageCount: content.pageCount ?? row.pageCount,
      rowCount: content.rowCount ?? row.rowCount,
    },
    content,
  });
});

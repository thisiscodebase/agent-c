import { NextResponse } from "next/server";
import { threadIdParamsSchema } from "~~/server/schemas/threads";
import {
  createAttachmentForUser,
  listAttachmentsForThread,
} from "~~/server/utils/attachments";
import { createError } from "~~/server/utils/http-error";
import { withRoute } from "~~/server/utils/route-handler";
import { requireSessionUserId } from "~~/server/utils/session";
import {
  MAX_ATTACHMENTS_PER_TURN,
  type UploadedAttachment,
} from "#shared/types/attachment";

type RouteParams = { params: Promise<{ id: string }> };

export const GET = withRoute(async (request: Request, { params }: RouteParams) => {
  const { id: threadId } = threadIdParamsSchema.parse(await params);
  const userId = await requireSessionUserId(request.headers);
  const attachments = await listAttachmentsForThread(userId, threadId);
  return NextResponse.json({ attachments });
});

export const POST = withRoute(async (request: Request, { params }: RouteParams) => {
  const { id: threadId } = threadIdParamsSchema.parse(await params);
  const userId = await requireSessionUserId(request.headers);

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    throw createError({
      statusCode: 400,
      statusMessage: "Expected multipart/form-data",
    });
  }

  const form = await request.formData();
  const files = form
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    const single = form.get("file");
    if (single instanceof File) {
      files.push(single);
    }
  }

  if (files.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "No files provided",
    });
  }

  if (files.length > MAX_ATTACHMENTS_PER_TURN) {
    throw createError({
      statusCode: 400,
      statusMessage: `At most ${MAX_ATTACHMENTS_PER_TURN} files per upload`,
    });
  }

  const uploaded: UploadedAttachment[] = [];

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const record = await createAttachmentForUser(userId, threadId, {
      filename: file.name || "file",
      mimeType: file.type || "application/octet-stream",
      bytes,
    });

    uploaded.push({
      id: record.id,
      name: record.filename,
      type: record.mimeType,
      url: "",
      sizeBytes: record.sizeBytes,
      pageCount: record.pageCount,
      rowCount: record.rowCount,
    });
  }

  return NextResponse.json({ attachments: uploaded }, { status: 201 });
});

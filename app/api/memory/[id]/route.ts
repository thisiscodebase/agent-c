import { NextResponse } from "next/server";
import { memoryIdParamsSchema, patchMemoryBodySchema } from "~~/server/schemas/memory";
import { deleteMemoryEntry, updateMemoryEntry } from "~~/server/utils/memory";
import { requireSessionUserId } from "~~/server/utils/session";
import { createError } from "~~/server/utils/http-error";
import { withRoute } from "~~/server/utils/route-handler";

type RouteParams = { params: Promise<{ id: string }> };

export const PATCH = withRoute(async (request: Request, { params }: RouteParams) => {
  const userId = await requireSessionUserId(request.headers);
  const { id } = memoryIdParamsSchema.parse(await params);
  const body = patchMemoryBodySchema.parse(await request.json());

  const entry = await updateMemoryEntry(userId, id, body.content);
  if (!entry) {
    throw createError({ statusCode: 404, statusMessage: "Memory entry not found" });
  }

  return NextResponse.json({ entry });
});

export const DELETE = withRoute(async (request: Request, { params }: RouteParams) => {
  const userId = await requireSessionUserId(request.headers);
  const { id } = memoryIdParamsSchema.parse(await params);

  const deleted = await deleteMemoryEntry(userId, id);
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: "Memory entry not found" });
  }

  return NextResponse.json({ ok: true });
});

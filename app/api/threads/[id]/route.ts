import { NextResponse } from "next/server";
import { patchThreadBodySchema, threadIdParamsSchema } from "~~/server/schemas/threads";
import { deleteThreadForUser, getThreadForUser, updateThreadForUser } from "~~/server/utils/threads";
import { requireSessionUserId } from "~~/server/utils/session";
import { createError } from "~~/server/utils/http-error";
import { withRoute } from "~~/server/utils/route-handler";

type RouteParams = { params: Promise<{ id: string }> };

export const GET = withRoute(async (request: Request, { params }: RouteParams) => {
  const { id } = threadIdParamsSchema.parse(await params);
  const userId = await requireSessionUserId(request.headers);

  const thread = await getThreadForUser(userId, id);
  if (!thread) {
    throw createError({ statusCode: 404, statusMessage: "Thread not found" });
  }

  return NextResponse.json({ thread });
});

export const PATCH = withRoute(async (request: Request, { params }: RouteParams) => {
  const { id } = threadIdParamsSchema.parse(await params);
  const userId = await requireSessionUserId(request.headers);
  const body = patchThreadBodySchema.parse(await request.json());

  const thread = await updateThreadForUser(userId, id, body);
  if (!thread) {
    throw createError({ statusCode: 404, statusMessage: "Thread not found" });
  }

  return NextResponse.json({ thread });
});

export const DELETE = withRoute(async (request: Request, { params }: RouteParams) => {
  const { id } = threadIdParamsSchema.parse(await params);
  const userId = await requireSessionUserId(request.headers);

  const deleted = await deleteThreadForUser(userId, id);
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: "Thread not found" });
  }

  return NextResponse.json({ ok: true });
});

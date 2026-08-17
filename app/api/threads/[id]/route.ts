import { NextResponse } from "next/server";
import { patchThreadBodySchema, threadIdParamsSchema } from "~~/server/schemas/threads";
import {
  deleteThreadForUser,
  getThreadForViewer,
  updateThreadForUser,
} from "~~/server/utils/threads";
import { requireSessionUser, requireSessionUserId } from "~~/server/utils/session";
import { createError } from "~~/server/utils/http-error";
import { withRoute } from "~~/server/utils/route-handler";

type RouteParams = { params: Promise<{ id: string }> };

export const GET = withRoute(async (request: Request, { params }: RouteParams) => {
  const { id } = threadIdParamsSchema.parse(await params);
  const { userId, email } = await requireSessionUser(request.headers);

  const resolved = await getThreadForViewer(userId, email, id);
  if (!resolved) {
    throw createError({ statusCode: 404, statusMessage: "Thread not found" });
  }

  return NextResponse.json({
    thread: resolved.thread,
    access: resolved.access,
  });
});

export const PATCH = withRoute(async (request: Request, { params }: RouteParams) => {
  const { id } = threadIdParamsSchema.parse(await params);
  const userId = await requireSessionUserId(request.headers);
  const body = patchThreadBodySchema.parse(await request.json());

  const result = await updateThreadForUser(userId, id, body);
  if (!result) {
    console.warn("[agent-c persist] PATCH rejected — thread not found", {
      userId,
      threadId: id,
      hasState: body.state !== undefined,
      eventCount: body.state?.events.length,
    });
    throw createError({ statusCode: 404, statusMessage: "Thread not found" });
  }

  if (result.merge?.keptLongerLog) {
    console.info("[agent-c persist] PATCH kept longer stored event log", {
      userId,
      threadId: id,
      incomingEventCount: result.merge.incomingEventCount,
      storedEventCount: result.merge.storedEventCount,
    });
  }

  return NextResponse.json({ thread: result.thread });
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

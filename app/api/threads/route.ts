import { NextResponse } from "next/server";
import { createThreadBodySchema } from "~~/server/schemas/threads";
import { createThreadForUser, listThreadsForUser } from "~~/server/utils/threads";
import { requireSessionUserId } from "~~/server/utils/session";
import { withRoute } from "~~/server/utils/route-handler";

export const GET = withRoute(async (request: Request) => {
  const userId = await requireSessionUserId(request.headers);
  const threads = await listThreadsForUser(userId);
  return NextResponse.json({ threads });
});

export const POST = withRoute(async (request: Request) => {
  const userId = await requireSessionUserId(request.headers);
  const body = createThreadBodySchema.parse(await request.json());
  const thread = await createThreadForUser(userId, body);
  return NextResponse.json({ thread }, { status: 201 });
});

import { NextResponse } from "next/server";
import { listMemoryForUser } from "~~/server/utils/memory";
import { requireSessionUserId } from "~~/server/utils/session";
import { withRoute } from "~~/server/utils/route-handler";

export const GET = withRoute(async (request: Request) => {
  const userId = await requireSessionUserId(request.headers);
  const memory = await listMemoryForUser(userId);
  return NextResponse.json({ memory });
});

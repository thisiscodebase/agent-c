import { NextResponse } from "next/server";
import { requireSessionUserId } from "~~/server/utils/session";
import { withRoute } from "~~/server/utils/route-handler";
import { getUsageMeterForUser } from "~~/server/utils/usage-meter";

export const GET = withRoute(async (request: Request) => {
  const userId = await requireSessionUserId(request.headers);
  const meter = await getUsageMeterForUser(userId);
  return NextResponse.json({ meter });
});

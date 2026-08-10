import { NextResponse } from "next/server";
import { usageMeterUserQuerySchema } from "~~/server/schemas/usage-meter";
import { requireInternalRequest } from "~~/server/utils/internal-api";
import { withRoute } from "~~/server/utils/route-handler";
import { getUsageMeterForUser } from "~~/server/utils/usage-meter";

export const GET = withRoute(async (request: Request) => {
  requireInternalRequest(request);

  const { searchParams } = new URL(request.url);
  const { userId } = usageMeterUserQuerySchema.parse(Object.fromEntries(searchParams));
  const meter = await getUsageMeterForUser(userId);
  return NextResponse.json({ meter });
});

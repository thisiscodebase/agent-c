import { NextResponse } from "next/server";
import { importMemoryBodySchema } from "~~/server/schemas/memory";
import { importMemoryForUser } from "~~/server/utils/memory";
import { requireSessionUserId } from "~~/server/utils/session";
import { withRoute } from "~~/server/utils/route-handler";

export const POST = withRoute(async (request: Request) => {
  const userId = await requireSessionUserId(request.headers);
  const body = importMemoryBodySchema.parse(await request.json());
  const result = await importMemoryForUser(userId, body.raw);
  return NextResponse.json(result);
});

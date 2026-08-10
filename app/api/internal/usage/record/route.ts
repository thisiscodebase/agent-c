import { NextResponse } from "next/server";
import { recordUsageMeterBodySchema } from "~~/server/schemas/usage-meter";
import { requireInternalRequest } from "~~/server/utils/internal-api";
import { withRoute } from "~~/server/utils/route-handler";
import { recordUsageMeterEvent } from "~~/server/utils/usage-meter";

export const POST = withRoute(async (request: Request) => {
  requireInternalRequest(request);

  const body = recordUsageMeterBodySchema.parse(await request.json());
  const result = await recordUsageMeterEvent(body);
  return NextResponse.json(result);
});

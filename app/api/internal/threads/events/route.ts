import { NextResponse } from "next/server";
import { appendThreadEventsBodySchema } from "~~/server/schemas/threads";
import { requireInternalRequest } from "~~/server/utils/internal-api";
import { withRoute } from "~~/server/utils/route-handler";
import { appendChannelThreadEvents } from "~~/server/utils/threads";

export const POST = withRoute(async (request: Request) => {
  requireInternalRequest(request);

  const body = appendThreadEventsBodySchema.parse(await request.json());
  await appendChannelThreadEvents(body);
  return NextResponse.json({ ok: true });
});

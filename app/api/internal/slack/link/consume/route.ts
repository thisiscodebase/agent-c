import { NextResponse } from "next/server";
import { slackLinkConsumeBodySchema } from "~~/server/schemas/slack";
import { consumeSlackLinkCode } from "~~/server/utils/slack-link-codes";
import { requireInternalRequest } from "~~/server/utils/internal-api";
import { withRoute } from "~~/server/utils/route-handler";

export const POST = withRoute(async (request: Request) => {
  requireInternalRequest(request);

  const body = slackLinkConsumeBodySchema.parse(await request.json());
  const result = await consumeSlackLinkCode(body);
  return NextResponse.json(result);
});

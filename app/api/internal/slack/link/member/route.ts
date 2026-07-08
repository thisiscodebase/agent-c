import { NextResponse } from "next/server";
import { slackMemberQuerySchema } from "~~/server/schemas/slack";
import { getSlackLinkForMember } from "~~/server/utils/slack-links";
import { requireInternalRequest } from "~~/server/utils/internal-api";
import { withRoute } from "~~/server/utils/route-handler";

export const GET = withRoute(async (request: Request) => {
  requireInternalRequest(request);

  const { searchParams } = new URL(request.url);
  const { teamId, userId } = slackMemberQuerySchema.parse(
    Object.fromEntries(searchParams),
  );
  const link = await getSlackLinkForMember(teamId, userId);

  return NextResponse.json({ link: link ?? null });
});

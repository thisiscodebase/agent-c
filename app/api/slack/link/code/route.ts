import { NextResponse } from "next/server";
import { createSlackLinkCode } from "~~/server/utils/slack-link-codes";
import { requireSessionUserId } from "~~/server/utils/session";
import { withRoute } from "~~/server/utils/route-handler";

export const POST = withRoute(async (request: Request) => {
  const appUserId = await requireSessionUserId(request.headers);
  const { code, expiresAt } = await createSlackLinkCode(appUserId);
  return NextResponse.json({ code, expiresAt });
});

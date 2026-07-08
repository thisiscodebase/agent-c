import { NextResponse } from "next/server";
import { getPendingSlackLinkCode } from "~~/server/utils/slack-link-codes";
import { deleteSlackLinkForAppUser, getSlackLinkForAppUser, toSlackLinkSummary } from "~~/server/utils/slack-links";
import { requireSessionUserId } from "~~/server/utils/session";
import { withRoute } from "~~/server/utils/route-handler";

export const GET = withRoute(async (request: Request) => {
  const appUserId = await requireSessionUserId(request.headers);
  const link = await getSlackLinkForAppUser(appUserId);
  const pending = await getPendingSlackLinkCode(appUserId);

  return NextResponse.json({
    ...toSlackLinkSummary(link),
    pendingCode: pending?.code,
    pendingExpiresAt: pending?.expiresAt,
  });
});

export const DELETE = withRoute(async (request: Request) => {
  const appUserId = await requireSessionUserId(request.headers);
  const removed = await deleteSlackLinkForAppUser(appUserId);
  return NextResponse.json({ removed });
});

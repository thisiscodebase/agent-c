import { NextResponse } from "next/server";
import { getCompanyProfile } from "~~/server/utils/company-stats";
import { withRoute } from "~~/server/utils/route-handler";
import { requireSessionUserId } from "~~/server/utils/session";

export const GET = withRoute(async (request: Request) => {
  await requireSessionUserId(request.headers);
  const company = await getCompanyProfile();
  return NextResponse.json({ company });
});

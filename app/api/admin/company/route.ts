import { NextResponse } from "next/server";
import { requireAdminSession } from "~~/server/utils/admin";
import { getAdminCompanyProfile } from "~~/server/utils/company-stats";
import { withRoute } from "~~/server/utils/route-handler";

export const GET = withRoute(async (request: Request) => {
  await requireAdminSession(request.headers);
  const company = await getAdminCompanyProfile();
  return NextResponse.json({ company });
});

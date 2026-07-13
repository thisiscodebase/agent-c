import { NextResponse } from "next/server";
import { requireAdminSession } from "~~/server/utils/admin";
import { getAdminUserDetail } from "~~/server/utils/admin-stats";
import { withRoute } from "~~/server/utils/route-handler";

export const GET = withRoute(
  async (request: Request, context: { params: Promise<{ handle: string }> }) => {
    await requireAdminSession(request.headers);
    const { handle } = await context.params;
    const user = await getAdminUserDetail(handle);
    return NextResponse.json({ user });
  },
);

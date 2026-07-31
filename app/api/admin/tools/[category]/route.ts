import { NextResponse } from "next/server";
import { requireAdminSession } from "~~/server/utils/admin";
import { getAdminToolCategoryDetail } from "~~/server/utils/company-stats";
import { withRoute } from "~~/server/utils/route-handler";

export const GET = withRoute(
  async (
    request: Request,
    context: { params: Promise<{ category: string }> },
  ) => {
    await requireAdminSession(request.headers);
    const { category } = await context.params;
    const tool = await getAdminToolCategoryDetail(decodeURIComponent(category));
    return NextResponse.json({ tool });
  },
);

import { NextResponse } from "next/server";
import { loadComposerSkillDetail } from "~~/server/utils/composer-skills";
import { createError } from "~~/server/utils/http-error";
import { requireSessionUserId } from "~~/server/utils/session";
import { withRoute } from "~~/server/utils/route-handler";

export const GET = withRoute(async (
  _request: Request,
  context: { params: Promise<{ id: string }> },
) => {
  await requireSessionUserId(_request.headers);
  const { id } = await context.params;
  const skill = await loadComposerSkillDetail(id);
  if (!skill) {
    throw createError({
      statusCode: 404,
      statusMessage: "Not found",
      message: "Skill not found",
    });
  }
  return NextResponse.json({ skill });
});

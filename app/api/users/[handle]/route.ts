import { NextResponse } from "next/server";
import { isValidHandle } from "#shared/user-handle";
import { createError } from "~~/server/utils/http-error";
import { getPublicProfileByHandle } from "~~/server/utils/public-profile";
import { withRoute } from "~~/server/utils/route-handler";
import { requireSessionUserId } from "~~/server/utils/session";

export const GET = withRoute(async (
  request: Request,
  context: { params: Promise<{ handle: string }> },
) => {
  const viewerUserId = await requireSessionUserId(request.headers);
  const { handle: rawHandle } = await context.params;
  const handle = decodeURIComponent(rawHandle);

  if (!isValidHandle(handle)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid handle" });
  }

  const profile = await getPublicProfileByHandle(handle, viewerUserId);
  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  return NextResponse.json({ profile });
});

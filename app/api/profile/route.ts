import { NextResponse } from "next/server";
import { patchProfileBodySchema } from "~~/server/schemas/profile";
import { getProfileWithUser, updateProfileForUser } from "~~/server/utils/profile";
import { requireSessionUserId } from "~~/server/utils/session";
import { createError } from "~~/server/utils/http-error";
import { withRoute } from "~~/server/utils/route-handler";

export const GET = withRoute(async (request: Request) => {
  const userId = await requireSessionUserId(request.headers);
  const profile = await getProfileWithUser(userId);

  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  return NextResponse.json({ profile });
});

export const PATCH = withRoute(async (request: Request) => {
  const userId = await requireSessionUserId(request.headers);
  const body = patchProfileBodySchema.parse(await request.json());
  const profile = await updateProfileForUser(userId, body);

  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  return NextResponse.json({ profile });
});

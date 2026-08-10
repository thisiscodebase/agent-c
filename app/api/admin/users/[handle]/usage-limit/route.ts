import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUsageLimitBodySchema } from "~~/server/schemas/usage-meter";
import { requireAdminSession } from "~~/server/utils/admin";
import { findUserByHandle } from "~~/server/utils/public-profile";
import { createError } from "~~/server/utils/http-error";
import { withRoute } from "~~/server/utils/route-handler";
import { setUsageLimitOverride } from "~~/server/utils/usage-meter";
import { isValidHandle } from "#shared/user-handle";

type RouteParams = { params: Promise<{ handle: string }> };

const handleParamsSchema = z.object({
  handle: z.string().trim().min(1),
});

export const PATCH = withRoute(async (request: Request, { params }: RouteParams) => {
  await requireAdminSession(request.headers);

  const { handle: rawHandle } = handleParamsSchema.parse(await params);
  const handle = decodeURIComponent(rawHandle);
  if (!isValidHandle(handle)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid handle" });
  }

  const user = await findUserByHandle(handle);
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  const body = adminUsageLimitBodySchema.parse(await request.json());
  const meter = await setUsageLimitOverride(user.id, body.limitUsd);
  return NextResponse.json({ meter });
});

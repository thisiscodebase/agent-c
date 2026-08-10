import { NextResponse } from "next/server";
import { adminUsageSettingsBodySchema } from "~~/server/schemas/usage-meter";
import { requireAdminSession } from "~~/server/utils/admin";
import { withRoute } from "~~/server/utils/route-handler";
import {
  listAdminUsageMeters,
  setUsageMeterDefaultLimit,
} from "~~/server/utils/usage-meter";

export const GET = withRoute(async (request: Request) => {
  await requireAdminSession(request.headers);
  const { meters, settings } = await listAdminUsageMeters();
  return NextResponse.json({ meters, settings });
});

export const PATCH = withRoute(async (request: Request) => {
  await requireAdminSession(request.headers);
  const body = adminUsageSettingsBodySchema.parse(await request.json());
  const settings = await setUsageMeterDefaultLimit(body.defaultLimitUsd);
  return NextResponse.json({ settings });
});

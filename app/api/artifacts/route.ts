import { NextResponse } from "next/server";
import { createArtifactBodySchema } from "~~/server/schemas/artifacts";
import { createArtifactForUser, listArtifactsForUser } from "~~/server/utils/artifacts";
import { requireSessionUserId } from "~~/server/utils/session";
import { withRoute } from "~~/server/utils/route-handler";

export const GET = withRoute(async (request: Request) => {
  const userId = await requireSessionUserId(request.headers);
  const artifacts = await listArtifactsForUser(userId);
  return NextResponse.json({ artifacts });
});

export const POST = withRoute(async (request: Request) => {
  const userId = await requireSessionUserId(request.headers);
  const body = createArtifactBodySchema.parse(await request.json());
  const artifact = await createArtifactForUser(userId, body);
  return NextResponse.json({ artifact }, { status: 201 });
});

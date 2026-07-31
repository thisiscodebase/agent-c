import { NextResponse } from "next/server";
import { internalCreateArtifactBodySchema } from "~~/server/schemas/artifacts";
import { createArtifactForUser } from "~~/server/utils/artifacts";
import { requireInternalRequest } from "~~/server/utils/internal-api";
import { withRoute } from "~~/server/utils/route-handler";

export const POST = withRoute(async (request: Request) => {
  requireInternalRequest(request);

  const { userId, ...input } = internalCreateArtifactBodySchema.parse(await request.json());
  const artifact = await createArtifactForUser(userId, input);

  return NextResponse.json({ artifact }, { status: 201 });
});

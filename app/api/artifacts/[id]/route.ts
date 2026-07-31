import { NextResponse } from "next/server";
import { artifactIdParamsSchema, patchArtifactBodySchema } from "~~/server/schemas/artifacts";
import {
  deleteArtifactForUser,
  getArtifactForUser,
  updateArtifactForUser,
} from "~~/server/utils/artifacts";
import { requireSessionUserId } from "~~/server/utils/session";
import { createError } from "~~/server/utils/http-error";
import { withRoute } from "~~/server/utils/route-handler";

type RouteParams = { params: Promise<{ id: string }> };

export const GET = withRoute(async (request: Request, { params }: RouteParams) => {
  const userId = await requireSessionUserId(request.headers);
  const { id } = artifactIdParamsSchema.parse(await params);

  const artifact = await getArtifactForUser(userId, id);
  if (!artifact) {
    throw createError({ statusCode: 404, statusMessage: "Artifact not found" });
  }

  return NextResponse.json({ artifact });
});

export const PATCH = withRoute(async (request: Request, { params }: RouteParams) => {
  const userId = await requireSessionUserId(request.headers);
  const { id } = artifactIdParamsSchema.parse(await params);
  const body = patchArtifactBodySchema.parse(await request.json());

  const artifact = await updateArtifactForUser(userId, id, body);
  if (!artifact) {
    throw createError({ statusCode: 404, statusMessage: "Artifact not found" });
  }

  return NextResponse.json({ artifact });
});

export const DELETE = withRoute(async (request: Request, { params }: RouteParams) => {
  const userId = await requireSessionUserId(request.headers);
  const { id } = artifactIdParamsSchema.parse(await params);

  const deleted = await deleteArtifactForUser(userId, id);
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: "Artifact not found" });
  }

  return NextResponse.json({ ok: true });
});

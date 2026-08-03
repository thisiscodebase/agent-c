import { NextResponse } from "next/server";
import { z } from "zod";
import { isComposerRefService } from "#shared/composer-refs";
import { getConnector } from "~~/server/connectors";
import { mintUserToken, probeStatus } from "~~/server/utils/connect";
import { getDriveRefDetail } from "~~/server/utils/drive-ref-detail";
import { throwConnectError } from "~~/server/utils/errors";
import { fetchNotionRefDetail } from "~~/server/utils/notion-refs";
import { createError } from "~~/server/utils/http-error";
import { requireSessionUserId } from "~~/server/utils/session";
import { withRoute } from "~~/server/utils/route-handler";

const paramsSchema = z.object({
  service: z.string().min(1),
  id: z.string().min(1),
});

export const GET = withRoute(async (
  request: Request,
  context: { params: Promise<{ service: string; id: string }> },
) => {
  const userId = await requireSessionUserId(request.headers);
  const raw = await context.params;
  const parsed = paramsSchema.parse(raw);

  if (!isComposerRefService(parsed.service)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid service",
      message: "service must be drive or notion",
    });
  }

  const connector = getConnector(parsed.service);
  const status = await probeStatus(connector, userId);
  if (status.state !== "connected") {
    throw createError({
      statusCode: 400,
      statusMessage: "Not connected",
      message: `${connector.name} is not connected`,
    });
  }

  const url = new URL(request.url);
  const fallbackName = url.searchParams.get("name") ?? undefined;

  try {
    const token = await mintUserToken(
      connector,
      userId,
      status.installationId,
    );

    if (parsed.service === "drive") {
      const item = await getDriveRefDetail(token, parsed.id);
      return NextResponse.json({ item });
    }

    const item = await fetchNotionRefDetail(token, parsed.id, fallbackName);
    return NextResponse.json({ item });
  } catch (error) {
    throwConnectError(error);
  }
});

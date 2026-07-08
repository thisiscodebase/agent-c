import { NextResponse } from "next/server";
import { getConnector } from "~~/server/connectors";
import { connectorIdParamsSchema } from "~~/server/schemas/integrations";
import { probeStatus, revokeConnection } from "~~/server/utils/connect";
import { throwConnectError } from "~~/server/utils/errors";
import { requireSessionUserId } from "~~/server/utils/session";
import { withRoute } from "~~/server/utils/route-handler";

type RouteParams = { params: Promise<{ id: string }> };

export const POST = withRoute(async (request: Request, { params }: RouteParams) => {
  const { id } = connectorIdParamsSchema.parse(await params);

  const connector = getConnector(id);
  const userId = await requireSessionUserId(request.headers);
  const status = await probeStatus(connector, userId);
  const installationId = status.state === "connected" ? status.installationId : undefined;

  try {
    await revokeConnection(connector, userId, installationId);
    return NextResponse.json({ ok: true });
  }
  catch (error) {
    throwConnectError(error);
  }
});

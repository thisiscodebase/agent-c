import { NextResponse } from "next/server";
import { getConnector } from "~~/server/connectors";
import { connectorIdParamsSchema } from "~~/server/schemas/integrations";
import { mintUserToken, probeStatus } from "~~/server/utils/connect";
import { throwConnectError } from "~~/server/utils/errors";
import { requireSessionUserId } from "~~/server/utils/session";
import { withRoute } from "~~/server/utils/route-handler";

type RouteParams = { params: Promise<{ id: string }> };

export const POST = withRoute(async (request: Request, { params }: RouteParams) => {
  const { id } = connectorIdParamsSchema.parse(await params);

  const connector = getConnector(id);
  const userId = await requireSessionUserId(request.headers);

  try {
    const status = await probeStatus(connector, userId);
    const installationId = status.state === "connected" ? status.installationId : undefined;
    const token = await mintUserToken(connector, userId, installationId);
    const results = await connector.test.run(token);
    return NextResponse.json({ results });
  }
  catch (error) {
    throwConnectError(error);
  }
});

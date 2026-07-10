import { NextResponse } from "next/server";
import { connectors } from "~~/server/connectors";
import { probeStatus } from "~~/server/utils/connect";
import { requireSessionUserId } from "~~/server/utils/session";
import { withRoute } from "~~/server/utils/route-handler";

export const GET = withRoute(async (request: Request) => {
  const userId = await requireSessionUserId(request.headers);

  const summaries = await Promise.all(
    connectors.map(async (connector) => {
      const status = await probeStatus(connector, userId);

      return {
        id: connector.id,
        name: connector.name,
        description: connector.description,
        icon: connector.icon,
        connectorUid: connector.connector,
        connectionName: connector.connectionName,
        testLabel: connector.test.label,
        status,
        connectedAs: status.state === "connected" ? status.label : undefined,
        authMode: connector.authMode ?? "user",
      };
    }),
  );

  return NextResponse.json(summaries);
});

import { NextResponse } from "next/server";
import { getConnector } from "~~/server/connectors";
import { connectQuerySchema, connectorIdParamsSchema } from "~~/server/schemas/integrations";
import { isValidEveResumeUrl, startConnectFlow } from "~~/server/utils/connect";
import { throwConnectError } from "~~/server/utils/errors";
import { getRequestOrigin } from "~~/server/utils/internal-api";
import { requireSessionUserId } from "~~/server/utils/session";
import { withRoute } from "~~/server/utils/route-handler";

type RouteParams = { params: Promise<{ id: string }> };

export const POST = withRoute(async (request: Request, { params }: RouteParams) => {
  const { id } = connectorIdParamsSchema.parse(await params);
  const { searchParams } = new URL(request.url);
  const { resumeUrl } = connectQuerySchema.parse(Object.fromEntries(searchParams));

  const connector = getConnector(id);
  const userId = await requireSessionUserId(request.headers);
  const origin = getRequestOrigin(request);

  const callbackUrl = resumeUrl && isValidEveResumeUrl(resumeUrl, origin)
    ? resumeUrl
    : `${origin}/settings/integrations?connected=${connector.id}`;

  try {
    const { url } = await startConnectFlow(connector, userId, callbackUrl);
    return NextResponse.json({ url });
  }
  catch (error) {
    throwConnectError(error);
  }
});

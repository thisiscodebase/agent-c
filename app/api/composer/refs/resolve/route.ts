import { NextResponse } from "next/server";
import { z } from "zod";
import type { ComposerRefItem, ComposerRefService } from "#shared/composer-refs";
import { parseAsanaUrl } from "#shared/asana-url";
import { parseDriveUrl } from "#shared/drive-url";
import { parseHubspotCrmUrl } from "#shared/hubspot-crm-url";
import { parseNotionUrl } from "#shared/notion-url";
import { parseTallyUrl } from "#shared/tally-url";
import { getConnector } from "~~/server/connectors";
import { mintUserToken, probeStatus } from "~~/server/utils/connect";
import { resolveAsanaUrl } from "~~/server/utils/asana-refs";
import { resolveDriveUrl } from "~~/server/utils/drive-ref-detail";
import { throwConnectError } from "~~/server/utils/errors";
import { resolveHubspotCrmUrl } from "~~/server/utils/hubspot-refs";
import { resolveNotionUrl } from "~~/server/utils/notion-refs";
import { resolveTallyUrl } from "~~/server/utils/tally-refs";
import { createError } from "~~/server/utils/http-error";
import { requireSessionUserId } from "~~/server/utils/session";
import { withRoute } from "~~/server/utils/route-handler";

const bodySchema = z.object({
  url: z.string().url(),
});

type DetectedService = {
  service: ComposerRefService;
  resolve: (
    token: string,
    url: string,
  ) => Promise<ComposerRefItem>;
};

function detectPasteService(url: string): DetectedService | null {
  if (parseHubspotCrmUrl(url)) {
    return { service: "hubspot", resolve: resolveHubspotCrmUrl };
  }
  if (parseAsanaUrl(url)) {
    return { service: "asana", resolve: resolveAsanaUrl };
  }
  if (parseTallyUrl(url)) {
    return { service: "tally", resolve: resolveTallyUrl };
  }
  if (parseDriveUrl(url)) {
    return { service: "drive", resolve: resolveDriveUrl };
  }
  if (parseNotionUrl(url)) {
    return { service: "notion", resolve: resolveNotionUrl };
  }
  return null;
}

/**
 * Resolve a pasted connector URL into a composer ref chip payload.
 */
export const POST = withRoute(async (request: Request) => {
  const userId = await requireSessionUserId(request.headers);
  const body = bodySchema.parse(await request.json());

  const detected = detectPasteService(body.url);
  if (!detected) {
    throw createError({
      statusCode: 400,
      statusMessage: "Unsupported URL",
      message:
        "Only HubSpot, Asana, Tally, Google Drive/Docs, or Notion links can be resolved",
    });
  }

  const connector = getConnector(detected.service);
  const status = await probeStatus(connector, userId);
  if (status.state !== "connected") {
    throw createError({
      statusCode: 400,
      statusMessage: "Not connected",
      message: `Connect ${connector.name} in Settings → Integrations first`,
    });
  }

  try {
    const token = await mintUserToken(
      connector,
      userId,
      status.installationId,
    );
    const item = await detected.resolve(token, body.url);
    return NextResponse.json({ service: detected.service, item });
  } catch (error) {
    throwConnectError(error);
  }
});

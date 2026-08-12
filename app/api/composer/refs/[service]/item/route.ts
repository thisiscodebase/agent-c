import { NextResponse } from "next/server";
import { z } from "zod";
import { isComposerRefService } from "#shared/composer-refs";
import {
  asanaFallbackName,
  formatAsanaRefId,
  parseAsanaRefId,
} from "#shared/asana-url";
import {
  formatHubspotRefId,
  hubspotKindLabel,
  parseHubspotRefId,
} from "#shared/hubspot-crm-url";
import { tallyFallbackName } from "#shared/tally-url";
import { getConnector } from "~~/server/connectors";
import { mintUserToken, probeStatus } from "~~/server/utils/connect";
import { fetchAsanaRefDetail } from "~~/server/utils/asana-refs";
import { getDriveRefDetail } from "~~/server/utils/drive-ref-detail";
import { throwConnectError } from "~~/server/utils/errors";
import { fetchHubspotRefDetail } from "~~/server/utils/hubspot-refs";
import { fetchNotionRefDetail } from "~~/server/utils/notion-refs";
import { fetchTallyRefDetail } from "~~/server/utils/tally-refs";
import { createError } from "~~/server/utils/http-error";
import { requireSessionUserId } from "~~/server/utils/session";
import { withRoute } from "~~/server/utils/route-handler";

const querySchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
});

/**
 * Detail lookup with id in the query string so composite ids
 * (`contact:123`, `task:456`) are not mangled by path segment decoding.
 */
export const GET = withRoute(async (
  request: Request,
  context: { params: Promise<{ service: string }> },
) => {
  const userId = await requireSessionUserId(request.headers);
  const { service: rawService } = await context.params;

  if (!isComposerRefService(rawService)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid service",
      message: "service must be drive, notion, hubspot, asana, or tally",
    });
  }

  const url = new URL(request.url);
  const parsed = querySchema.parse({
    id: url.searchParams.get("id") ?? "",
    name: url.searchParams.get("name") ?? undefined,
  });

  const connector = getConnector(rawService);
  const status = await probeStatus(connector, userId);
  if (status.state !== "connected") {
    if (rawService === "hubspot") {
      const hubspotId = parseHubspotRefId(parsed.id);
      if (hubspotId) {
        return NextResponse.json({
          item: {
            id: formatHubspotRefId(hubspotId.kind, hubspotId.objectId),
            name:
              parsed.name ||
              `${hubspotKindLabel(hubspotId.kind)} ${hubspotId.objectId}`,
            mimeType: `hubspot/${hubspotId.kind}`,
            bodyNote:
              "Connect HubSpot in Settings → Integrations to load a live preview.",
          },
        });
      }
    }
    if (rawService === "asana") {
      const asanaId = parseAsanaRefId(parsed.id);
      if (asanaId) {
        return NextResponse.json({
          item: {
            id: formatAsanaRefId(asanaId.kind, asanaId.objectId),
            name:
              parsed.name ||
              asanaFallbackName(asanaId.kind, asanaId.objectId),
            mimeType: `asana/${asanaId.kind}`,
            bodyNote:
              "Connect Asana in Settings → Integrations to load a live preview.",
          },
        });
      }
    }
    if (rawService === "tally") {
      return NextResponse.json({
        item: {
          id: parsed.id,
          name: parsed.name || tallyFallbackName(parsed.id),
          url: `https://tally.so/r/${parsed.id}`,
          mimeType: "tally/form",
          bodyNote:
            "Connect Tally in Settings → Integrations to load a live preview.",
        },
      });
    }
    throw createError({
      statusCode: 400,
      statusMessage: "Not connected",
      message: `${connector.name} is not connected`,
    });
  }

  try {
    const token = await mintUserToken(
      connector,
      userId,
      status.installationId,
    );

    switch (rawService) {
      case "drive": {
        const item = await getDriveRefDetail(token, parsed.id);
        return NextResponse.json({ item });
      }
      case "notion": {
        const item = await fetchNotionRefDetail(
          token,
          parsed.id,
          parsed.name,
        );
        return NextResponse.json({ item });
      }
      case "hubspot": {
        const item = await fetchHubspotRefDetail(
          token,
          parsed.id,
          parsed.name,
        );
        return NextResponse.json({ item });
      }
      case "asana": {
        const item = await fetchAsanaRefDetail(
          token,
          parsed.id,
          parsed.name,
        );
        return NextResponse.json({ item });
      }
      case "tally": {
        const item = await fetchTallyRefDetail(
          token,
          parsed.id,
          parsed.name,
        );
        return NextResponse.json({ item });
      }
      default: {
        const _exhaustive: never = rawService;
        return _exhaustive;
      }
    }
  } catch (error) {
    throwConnectError(error);
  }
});

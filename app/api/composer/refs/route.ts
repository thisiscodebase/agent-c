import { NextResponse } from "next/server";
import { z } from "zod";
import {
  isComposerRefService,
  type ComposerRefItem,
} from "#shared/composer-refs";
import { getConnector } from "~~/server/connectors";
import { mintUserToken, probeStatus } from "~~/server/utils/connect";
import {
  listRecentDriveRefs,
  searchDriveRefs,
} from "~~/server/utils/drive-refs";
import { throwConnectError } from "~~/server/utils/errors";
import { searchAsanaRefs } from "~~/server/utils/asana-refs";
import { searchHubspotRefs } from "~~/server/utils/hubspot-refs";
import { searchNotionRefs } from "~~/server/utils/notion-refs";
import { searchTallyRefs } from "~~/server/utils/tally-refs";
import { createError } from "~~/server/utils/http-error";
import { requireSessionUserId } from "~~/server/utils/session";
import { withRoute } from "~~/server/utils/route-handler";

const querySchema = z.object({
  service: z.string().min(1),
  q: z.string().optional().default(""),
});

export const GET = withRoute(async (request: Request) => {
  const userId = await requireSessionUserId(request.headers);
  const url = new URL(request.url);
  const parsed = querySchema.parse({
    service: url.searchParams.get("service") ?? "",
    q: url.searchParams.get("q") ?? "",
  });

  if (!isComposerRefService(parsed.service)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid service",
      message: "service must be drive, notion, hubspot, asana, or tally",
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

  try {
    const token = await mintUserToken(
      connector,
      userId,
      status.installationId,
    );

    let items: ComposerRefItem[];
    let meta: { connecting?: boolean } | undefined;

    switch (parsed.service) {
      case "drive": {
        items = parsed.q.trim()
          ? await searchDriveRefs(token, parsed.q)
          : await listRecentDriveRefs(token);
        break;
      }
      case "notion": {
        const notion = await searchNotionRefs(token, parsed.q);
        items = notion.items;
        if (notion.session === "new") {
          meta = { connecting: true };
        }
        break;
      }
      case "hubspot": {
        const hubspot = await searchHubspotRefs(token, parsed.q);
        items = hubspot.items;
        if (hubspot.session === "new") {
          meta = { connecting: true };
        }
        break;
      }
      case "asana": {
        const asana = await searchAsanaRefs(token, parsed.q);
        items = asana.items;
        if (asana.session === "new") {
          meta = { connecting: true };
        }
        break;
      }
      case "tally": {
        const tally = await searchTallyRefs(token, parsed.q);
        items = tally.items;
        if (tally.session === "new") {
          meta = { connecting: true };
        }
        break;
      }
      default: {
        const _exhaustive: never = parsed.service;
        return _exhaustive;
      }
    }

    return NextResponse.json({ items, meta });
  } catch (error) {
    throwConnectError(error);
  }
});

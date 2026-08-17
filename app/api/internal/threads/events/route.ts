import { NextResponse } from "next/server";
import { appendThreadEventsBodySchema } from "~~/server/schemas/threads";
import { requireInternalRequest } from "~~/server/utils/internal-api";
import { withRoute } from "~~/server/utils/route-handler";
import { appendChannelThreadEvents } from "~~/server/utils/threads";

export const POST = withRoute(async (request: Request) => {
  requireInternalRequest(request);

  const body = appendThreadEventsBodySchema.parse(await request.json());
  const eventTypes = body.events.map((event) => {
    if (event && typeof event === "object" && "type" in event) {
      const type = (event as { type?: unknown }).type;
      return typeof type === "string" ? type : "unknown";
    }
    return "unknown";
  });

  try {
    const { created } = await appendChannelThreadEvents(body);
    if (created) {
      console.info("[agent-c persist] thread row created by ingest", {
        userId: body.userId,
        threadId: body.threadId,
        sessionId: body.sessionId,
        source: body.source,
        eventTypes,
      });
    }
    return NextResponse.json({ ok: true, created });
  } catch (error) {
    console.warn("[agent-c persist] ingest failed", {
      userId: body.userId,
      threadId: body.threadId,
      sessionId: body.sessionId,
      source: body.source,
      eventTypes,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
});

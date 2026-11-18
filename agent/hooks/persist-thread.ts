import { defineHook } from "eve/hooks";
import type { HookContext, HookEvent } from "eve/hooks";
import {
  resolvePersistTarget,
  shouldPersistEvent,
  titleFromSlackMessageEvent,
} from "../../shared/thread-persist-policy.js";
import { isAppUserId } from "../../shared/usage-meter.js";
import { persistThreadEventsRemote } from "../lib/thread-persist-internal.js";

function textFromDeliveryParts(data: { parts?: unknown }): string {
  if (!Array.isArray(data.parts)) return "";
  return data.parts
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .filter((text) => text.trim().length > 0)
    .join("\n");
}

function titleFromSlackEvent(event: HookEvent, ctx: HookContext): string {
  const data = "data" in event && event.data && typeof event.data === "object"
    ? (event.data as { message?: unknown; text?: unknown; parts?: unknown })
    : undefined;
  const raw =
    (typeof data?.message === "string" && data.message.trim())
    || (typeof data?.text === "string" && data.text.trim())
    || (data ? textFromDeliveryParts(data) : "");
  return titleFromSlackMessageEvent({
    eventType: event.type,
    messageText: raw || undefined,
    attributes: ctx.session.auth.current?.attributes,
  });
}

export default defineHook({
  events: {
    async "*"(event, ctx) {
      const target = resolvePersistTarget({
        channelKind: ctx.channel.kind,
        sessionId: ctx.session.id,
        attributes: ctx.session.auth.current?.attributes,
      });
      if (!target) {
        return;
      }
      if (!shouldPersistEvent(event.type, target.source)) {
        return;
      }
      // Web transcripts come from the browser snapshot. Those events carry the
      // reader position Eve needs to reopen a thread. Hook facts do not, and
      // appending them makes the next page load throw.
      if (target.source === "web") {
        return;
      }

      const userId = ctx.session.auth.current?.principalId;
      if (!isAppUserId(userId)) {
        return;
      }

      try {
        await persistThreadEventsRemote({
          userId,
          threadId: target.threadId,
          sessionId: ctx.session.id,
          source: target.source,
          title: target.source === "slack"
            ? titleFromSlackEvent(event, ctx)
            : undefined,
          events: [event],
        });
      } catch (error) {
        console.error("[agent-c persist] hook failed", {
          userId,
          threadId: target.threadId,
          sessionId: ctx.session.id,
          source: target.source,
          eventType: event.type,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  },
});

import { defineHook } from "eve/hooks";
import type { HookContext, HookEvent } from "eve/hooks";
import {
  DEFAULT_SLACK_THREAD_TITLE,
  slackThreadId,
  truncateThreadTitle,
} from "../../shared/types/thread.js";
import { isAppUserId } from "../../shared/usage-meter.js";
import { persistSlackThreadEventsRemote } from "../lib/slack-thread-internal.js";

/** Events the leaderboard aggregator actually reads. */
const PERSISTED_EVENT_TYPES = new Set<HookEvent["type"]>([
  "session.started",
  "turn.started",
  "message.received",
  "actions.requested",
  "step.completed",
]);

function isSlackChannel(ctx: HookContext): boolean {
  const kind = ctx.channel.kind;
  if (kind === "channel:slack" || kind === "slack") {
    return true;
  }

  const attrs = ctx.session.auth.current?.attributes;
  const linked = attrs?.linked;
  const slackUserId = attrs?.slack_user_id;
  return linked === "true" && typeof slackUserId === "string" && slackUserId.length > 0;
}

function readAttr(
  attrs: Readonly<Record<string, string | readonly string[]>> | undefined,
  key: string,
): string | undefined {
  const value = attrs?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function slackPlaceholderTitle(ctx: HookContext): string {
  const attrs = ctx.session.auth.current?.attributes;
  const name = readAttr(attrs, "slack_user_name") ?? readAttr(attrs, "name");
  if (!name) {
    return DEFAULT_SLACK_THREAD_TITLE;
  }
  return truncateThreadTitle(`${DEFAULT_SLACK_THREAD_TITLE} · ${name}`);
}

function titleFromEvent(event: HookEvent, ctx: HookContext): string | undefined {
  if (event.type !== "message.received") {
    return slackPlaceholderTitle(ctx);
  }

  const data = event.data as { message?: unknown; text?: unknown };
  const text =
    (typeof data.message === "string" && data.message.trim())
    || (typeof data.text === "string" && data.text.trim())
    || "";
  if (!text) {
    return slackPlaceholderTitle(ctx);
  }
  return truncateThreadTitle(`${DEFAULT_SLACK_THREAD_TITLE}: ${text}`);
}

export default defineHook({
  events: {
    async "*"(event, ctx) {
      if (!PERSISTED_EVENT_TYPES.has(event.type)) {
        return;
      }
      if (!isSlackChannel(ctx)) {
        return;
      }

      const userId = ctx.session.auth.current?.principalId;
      if (!isAppUserId(userId)) {
        return;
      }

      try {
        await persistSlackThreadEventsRemote({
          userId,
          threadId: slackThreadId(ctx.session.id),
          sessionId: ctx.session.id,
          continuationToken: ctx.channel.continuationToken,
          title: titleFromEvent(event, ctx),
          events: [event],
        });
      } catch (error) {
        console.error("[persist-slack-thread] failed to persist event", {
          userId,
          sessionId: ctx.session.id,
          eventType: event.type,
          error,
        });
      }
    },
  },
});

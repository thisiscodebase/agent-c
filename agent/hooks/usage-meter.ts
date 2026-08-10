import { defineHook } from "eve/hooks";
import {
  isAppUserId,
  USAGE_LIMIT_REACHED_CODE,
  USAGE_LIMIT_REACHED_MESSAGE,
} from "../../shared/usage-meter.js";
import {
  fetchUsageMeter,
  recordUsageMeterRemote,
} from "../lib/usage-meter-internal.js";

function principalUserId(ctx: {
  session: { auth: { current?: { principalId?: string } | null } };
}): string | undefined {
  const principalId = ctx.session.auth.current?.principalId;
  return isAppUserId(principalId) ? principalId : undefined;
}

class UsageLimitReachedError extends Error {
  readonly code = USAGE_LIMIT_REACHED_CODE;

  constructor() {
    super(USAGE_LIMIT_REACHED_MESSAGE);
    this.name = "UsageLimitReachedError";
  }
}

export default defineHook({
  events: {
    async "turn.started"(_event, ctx) {
      const userId = principalUserId(ctx);
      if (!userId) {
        return;
      }

      const meter = await fetchUsageMeter(userId);
      if (meter?.status === "blocked") {
        throw new UsageLimitReachedError();
      }
    },

    async "step.completed"(event, ctx) {
      const userId = principalUserId(ctx);
      if (!userId) {
        return;
      }

      const costUsd = event.data.usage?.costUsd ?? 0;
      if (!(typeof costUsd === "number" && costUsd > 0)) {
        return;
      }

      const eventId = event.meta?.id;
      if (!eventId) {
        return;
      }

      try {
        await recordUsageMeterRemote({
          userId,
          eventId,
          costUsd,
          sessionId: ctx.session.id,
          turnId: event.data.turnId,
          stepIndex: event.data.stepIndex,
        });
      } catch (error) {
        console.error("[usage-meter] failed to record step cost", {
          userId,
          eventId,
          error,
        });
      }
    },
  },
});

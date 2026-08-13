import { defineDynamic, defineInstructions } from "eve/instructions";
import type { DynamicResolveContext } from "eve/instructions";
import { isAppUserId } from "../shared/usage-meter.js";
import { getBaseInstructions } from "./lib/base-instructions.js";
import { buildUserContextPrompt, fetchUserContext } from "./lib/memory-internal.js";

export default defineDynamic({
  events: {
    "session.started": async (_event, ctx: DynamicResolveContext) => {
      const base = getBaseInstructions();
      const userId = ctx.session.auth.current?.principalId;
      if (!isAppUserId(userId)) {
        return defineInstructions({ markdown: base });
      }

      const context = await fetchUserContext(userId);
      if (!context) {
        return defineInstructions({ markdown: base });
      }

      const userBlock = buildUserContextPrompt(context);
      return defineInstructions({
        markdown: `${base}\n\n---\n\n${userBlock}`,
      });
    },
  },
});

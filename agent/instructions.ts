import { defineDynamic, defineInstructions } from "eve/instructions";
import { isAppUserId } from "../shared/usage-meter.js";
import { getBaseInstructions } from "./lib/base-instructions.js";
import { buildUserContextPrompt, fetchUserContext } from "./lib/memory-internal.js";

export default defineDynamic((ctx) =>
  ctx.memo(ctx.session.id, async () => {
    const base = getBaseInstructions();
    const userId = ctx.session.auth.current?.principalId;
    if (!isAppUserId(userId)) {
      return defineInstructions({ content: base });
    }

    const context = await fetchUserContext(userId);
    if (!context) {
      return defineInstructions({ content: base });
    }

    const userBlock = buildUserContextPrompt(context);
    return defineInstructions({
      content: `${base}\n\n---\n\n${userBlock}`,
    });
  }),
);

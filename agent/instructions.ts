import { defineDynamic, defineInstructions } from "eve/instructions";
import { isAppUserId } from "../shared/usage-meter.js";
import { getBaseInstructions } from "./lib/base-instructions.js";
import { buildUserContextPrompt, fetchUserContext } from "./lib/memory-internal.js";

export default defineDynamic(async (ctx) => {
  // Memo stores a plain value. defineInstructions brands its return, and
  // that brand does not survive the memo cache.
  const content = await ctx.memo(ctx.session.id, async () => {
    const base = getBaseInstructions();
    const userId = ctx.session.auth.current?.principalId;
    if (!isAppUserId(userId)) return base;

    const context = await fetchUserContext(userId);
    if (!context) return base;

    return `${base}\n\n---\n\n${buildUserContextPrompt(context)}`;
  });

  return defineInstructions({ content });
});

import { DEFAULT_CHAT_CONTEXT_WINDOW_TOKENS } from "~/lib/thread-context-pressure";
import {
  estimateThreadContextBreakdown as estimateThreadContextBreakdownBase,
  type EstimateThreadContextBreakdownArgs,
  type ThreadContextBreakdown,
} from "#shared/thread-context-breakdown";

export {
  CONTEXT_CATEGORY_KEYS,
  contextCategoriesForDisplay,
  contextCategoryLabel,
  emptyCategories,
  type ContextBreakdownMessage,
  type ContextBreakdownMessagePart,
  type ContextCategoryKey,
  type ContextCategoryTokens,
  type EstimateThreadContextBreakdownArgs,
  type ThreadContextBreakdown,
} from "#shared/thread-context-breakdown";

/** App wrapper that defaults the context window to the chat pressure constant. */
export function estimateThreadContextBreakdown(
  args: EstimateThreadContextBreakdownArgs,
): ThreadContextBreakdown | null {
  return estimateThreadContextBreakdownBase({
    ...args,
    contextWindowTokens:
      args.contextWindowTokens ?? DEFAULT_CHAT_CONTEXT_WINDOW_TOKENS,
  });
}

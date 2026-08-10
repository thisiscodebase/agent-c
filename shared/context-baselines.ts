/**
 * Checked-in token estimates for prompt composition UI.
 * Refresh with chars/4 (`shared/estimate-tokens.ts`) when instructions, local
 * tools, or product skills change materially.
 *
 * Measured approx (2026-08):
 * - `getBaseInstructions()` markdown ≈ 20.3k chars → ~5070 tokens
 * - `agent/tools/*.ts` source as a proxy for local tool schemas ≈ ~2900 tokens
 * - `agent/skills/bid-writing/SKILL.md` ≈ 612 tokens
 * - Per MCP connector discovery schemas: fixed heuristic (not live dumps)
 */

/** Base system prompt (persona + playbook), excluding per-user memory. */
export const CONTEXT_BASELINE_SYSTEM_TOKENS = 5070;

/** Local `defineTool` schemas under `agent/tools/`. */
export const CONTEXT_BASELINE_LOCAL_TOOLS_TOKENS = 2900;

/**
 * Approximate schema cost once a connector has been discovered / used.
 * Applied once per distinct MCP connector seen in the thread.
 */
export const CONTEXT_BASELINE_MCP_PER_CONNECTOR_TOKENS = 3100;

/** Product skills that can contribute to context when loaded. */
export const CONTEXT_BASELINE_SKILL_TOKENS: Readonly<Record<string, number>> = {
  "bid-writing": 612,
};

/** MCP connectors that contribute schema weight (Drive uses local REST tools). */
export const CONTEXT_MCP_CONNECTORS = [
  "hubspot",
  "notion",
  "tally",
  "platform",
] as const;

export type ContextMcpConnector = (typeof CONTEXT_MCP_CONNECTORS)[number];

export function isContextMcpConnector(value: string): value is ContextMcpConnector {
  return (CONTEXT_MCP_CONNECTORS as readonly string[]).includes(value);
}

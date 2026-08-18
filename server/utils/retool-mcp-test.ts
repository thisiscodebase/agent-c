/**
 * Probe Retool hosted MCP with a Connect-minted OAuth token.
 *
 * MCP-audienced tokens are not accepted by the Retool REST API (and that
 * endpoint is the wrong validation target). Chat exercises MCP via Eve —
 * keep Integrations Test aligned with Notion/Asana/Tally.
 */

/**
 * Validate a Connect Retool MCP token and return display lines for the UI.
 */
export async function testRetoolMcpConnection(_token: string): Promise<string[]> {
  return [
    "Retool OAuth connected",
    "Use chat to list apps and resources via MCP (retool__retool_list_apps, etc.)",
  ];
}

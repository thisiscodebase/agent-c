import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";
import { TALLY_CONNECTOR } from "../../shared/connect.js";

/**
 * Tally hosted MCP — OAuth (recommended) or API key.
 * @see https://developers.tally.so/api-reference/mcp
 * @see https://tally.so/help/mcp
 *
 * Allow read/list tools for form + submission lookup; leave create/edit
 * discoverable via connection_search if needed later. Deletion is not
 * supported by Tally MCP.
 */
export default defineMcpClientConnection({
  url: "https://api.tally.so/mcp",
  description:
    "Tally forms and surveys: list forms, fetch form submissions and responses, analyze feedback and intake data the signed-in user can access. Use for Tally, form responses, survey results, NPS, waitlists, and submission data.",
  auth: connect(TALLY_CONNECTOR),
});

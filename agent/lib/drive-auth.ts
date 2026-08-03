import { connect } from "@vercel/connect/eve";
import { DRIVE_CONNECTOR, DRIVE_OAUTH_SCOPES } from "../../shared/connect.js";

/**
 * Per-user Drive OAuth via Vercel Connect (same grant as Integrations).
 * Temporary REST tools use this instead of the hosted Drive MCP server.
 */
export const driveAuth = connect({
  connector: DRIVE_CONNECTOR,
  tokenParams: { scopes: [...DRIVE_OAUTH_SCOPES] },
});

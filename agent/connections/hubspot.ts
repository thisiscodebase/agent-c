import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";
import { HUBSPOT_CONNECTOR, HUBSPOT_OAUTH_SCOPES } from "../../shared/connect.js";

/**
 * HubSpot official remote CRM MCP (per-user Connect OAuth).
 * @see https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server
 *
 * Allow-list read/search tools; block the write path (`manage_crm_objects`).
 */
export default defineMcpClientConnection({
  url: "https://mcp.hubspot.com",
  description:
    "HubSpot CRM: search and read companies, deals, contacts, owners, and properties for case-study lookup. Prefer this over guessing CRM facts.",
  auth: connect({
    connector: HUBSPOT_CONNECTOR,
    tokenParams: { scopes: [...HUBSPOT_OAUTH_SCOPES] },
  }),
  tools: {
    allow: [
      "get_user_details",
      "search_crm_objects",
      "get_crm_objects",
      "search_properties",
      "get_properties",
      "search_owners",
      "get_campaign_contacts_by_type",
      "get_campaign_analytics",
      "get_campaign_asset_types",
      "get_campaign_asset_metrics",
      "submit_feedback",
    ],
  },
});

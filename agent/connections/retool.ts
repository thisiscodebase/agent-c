import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";
import {
  RETOOL_CONNECTOR,
  RETOOL_MCP_URL,
  RETOOL_OAUTH_SCOPES,
} from "../../shared/connect.js";

/**
 * Retool hosted MCP — org-specific Streamable HTTP + OAuth 2.0.
 * @see https://docs.retool.com/org-users/guides/mcp
 * @see https://docs.retool.com/org-users/reference/mcp-tools
 *
 * Allow read/inspect tools and `retool_execute_resource_ts` (resource queries).
 * Mutation / app-building / admin-write tools are blocked until the
 * integration is confirmed — remove names from `block` to re-enable.
 */
export default defineMcpClientConnection({
  url: RETOOL_MCP_URL,
  description:
    "Retool workspace: list and inspect apps and resources the signed-in user can access, and query connected resources via TypeScript. Use for Retool apps, resources, environments, and resource data — not as a default people directory.",
  auth: connect({
    connector: RETOOL_CONNECTOR,
    tokenParams: { scopes: [...RETOOL_OAUTH_SCOPES] },
  }),
  tools: {
    block: [
      // Mutations — re-enable after the integration is confirmed.
      "retool_create_resource",
      "retool_update_resource",
      "retool_grant_app_access",
      "retool_revoke_app_access",
      "retool_list_react_app_files",
      "retool_read_react_app_files",
      "retool_create_or_append_react_app_thread_message",
      "retool_tail_react_app_thread_stream",
      "retool_list_pending_react_app_thread_reviews",
      "retool_respond_to_react_app_thread_review",
      "retool_cancel_react_app_thread_activity",
      "retool_sync_react_app_thread",
      "retool_publish_react_app",
      "retool_list_pending_react_app_function_approvals",
      "retool_start_prepared_import",
      "retool_finalize_prepared_import",
      "retool_submit_prepared_import",
      "retool_report_tool_usage_feedback",
      "retool_delete_workflow",
      "retool_create_user_invite",
      "retool_delete_user_invite",
      "retool_set_user_invite_attribute",
      "retool_delete_user_invite_attribute",
    ],
  },
});

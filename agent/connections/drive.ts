import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";
import { DRIVE_CONNECTOR } from "../../shared/connect.js";

/**
 * Google Drive official remote MCP (Developer Preview).
 * @see https://developers.google.com/workspace/drive/api/guides/configure-mcp-server
 */
export default defineMcpClientConnection({
  url: "https://drivemcp.googleapis.com/mcp/v1",
  description:
    "Google Drive: search files, read content and metadata the signed-in user can access. Use for case-study source material and customer documents.",
  auth: connect(DRIVE_CONNECTOR),
  tools: {
    allow: [
      "search_files",
      "read_file_content",
      "get_file_metadata",
      "list_recent_files",
      "get_file_permissions",
      "download_file_content",
    ],
  },
});

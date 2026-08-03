import { defineTool } from "eve/tools";
import { z } from "zod";
import { driveAuth } from "../lib/drive-auth.js";
import { readDriveFileContent } from "../lib/drive-api.js";

/**
 * Temporary Drive REST file reader — exports Google Docs/Sheets/Slides or
 * downloads text files. Bypasses hosted Drive MCP.
 *
 * @see https://developers.google.com/drive/api/reference/rest/v3/files/export
 * @see https://developers.google.com/drive/api/reference/rest/v3/files/get
 */
export default defineTool({
  description:
    "Read text content of a Google Drive file by file id (from search_drive or list_recent_drive). Supports Google Docs/Sheets/Slides (exported) and text-like files. Never guess a file id from a title.",
  inputSchema: z.object({
    fileId: z
      .string()
      .min(1)
      .describe(
        "Drive file id from search_drive / list_recent_drive, or a full Google Docs/Drive URL.",
      ),
  }),
  async execute({ fileId }, ctx) {
    const { token } = await ctx.getToken(driveAuth);
    return readDriveFileContent(token, fileId);
  },
});

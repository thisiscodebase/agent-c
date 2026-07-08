import { connect } from "@vercel/connect/eve";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { SLACK_CONNECTOR } from "../../shared/connect.js";

const slackSearchAuth = connect({
  connector: SLACK_CONNECTOR,
  tokenParams: {
    scopes: [
      "search:read.public",
      "search:read.private",
      "search:read.files",
      "search:read.users",
    ],
  },
});

/**
 * Slack search via Real-time Search API on the same Connect app as the
 * Slack channel (`slack/v`). Per-user token so ACLs match the caller.
 *
 * Expand the Connect Slack app with granular search scopes
 * (`search:read.public`, `search:read.private`, `search:read.files`,
 * `search:read.users`) — not the legacy `search:read` scope.
 *
 * @see https://docs.slack.dev/reference/methods/assistant.search.context
 */
export default defineTool({
  description:
    "Search Slack messages, files, and channels the signed-in user can access. Use for customer mentions, deal discussions, and case-study context. Prefer public/private channels; do not invent Slack content.",
  inputSchema: z.object({
    query: z.string().min(1).describe("Natural-language or keyword search query"),
    channelTypes: z
      .array(z.enum(["public_channel", "private_channel", "mpim", "im"]))
      .optional()
      .describe("Channel types to include. Defaults to public and private channels."),
    contentTypes: z
      .array(z.enum(["messages", "files", "channels", "users"]))
      .optional()
      .describe("Content types to include. Defaults to messages."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("Max results (1–20). Defaults to 10."),
  }),
  async execute({ query, channelTypes, contentTypes, limit }, ctx) {
    const { token } = await ctx.getToken(slackSearchAuth);

    const res = await fetch("https://slack.com/api/assistant.search.context", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        query,
        channel_types: channelTypes ?? ["public_channel", "private_channel"],
        content_types: contentTypes ?? ["messages"],
        limit: limit ?? 10,
        include_context_messages: true,
      }),
    });

    if (!res.ok) {
      throw new Error(`Slack search HTTP error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json() as {
      ok: boolean;
      error?: string;
      results?: {
        messages?: Array<{
          content?: string;
          channel_name?: string;
          author_name?: string;
          permalink?: string;
          message_ts?: string;
        }>;
        files?: Array<{
          title?: string;
          permalink?: string;
          file_type?: string;
        }>;
        channels?: Array<{
          name?: string;
          purpose?: string;
          permalink?: string;
        }>;
      };
      response_metadata?: { next_cursor?: string };
    };

    if (!data.ok) {
      throw new Error(`Slack search failed: ${data.error ?? "unknown_error"}`);
    }

    return {
      messages: data.results?.messages ?? [],
      files: data.results?.files ?? [],
      channels: data.results?.channels ?? [],
      nextCursor: data.response_metadata?.next_cursor || undefined,
    };
  },
});

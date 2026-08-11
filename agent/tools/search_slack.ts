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

// Slack bodies are long-tailed (median ~414 chars, p90 ~2.2k). 2000 truncates
// ~10% of real messages; dropping to 800 would truncate ~34% while saving only
// ~1.7KB per call — the savings come from `context_messages`, not from bodies.
const MAX_CONTENT_CHARS = 2000;
const MAX_CONTEXT_MESSAGES = 3;
const MAX_CONTEXT_CHARS = 500;

function trimText(value: string | undefined, max: number): string {
  const text = value ?? "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Slack returns whole surrounding channel history — up to 991 entries per hit. */
function projectContext(
  entries: SlackContextEntry[] | undefined,
  take: "first" | "last",
): ProjectedContextEntry[] | undefined {
  if (!entries?.length) {
    return undefined;
  }

  // Keep the entries nearest the hit: the tail of `before`, the head of `after`.
  const nearest = take === "last"
    ? entries.slice(-MAX_CONTEXT_MESSAGES)
    : entries.slice(0, MAX_CONTEXT_MESSAGES);

  return nearest.map((entry) => ({
    author_name: entry.author_name,
    text: trimText(entry.text, MAX_CONTEXT_CHARS),
  }));
}

/**
 * Slack returns far more per hit than the model needs — `context_messages`
 * alone measured 98% of a 690KB result. Project explicitly rather than
 * spreading the raw hit, so oversized payloads stay out of both the model
 * context and the stored thread state.
 */
function projectMessage(
  message: SlackMessageHit,
  includeContext: boolean,
): ProjectedMessage {
  const projected: ProjectedMessage = {
    content: trimText(message.content, MAX_CONTENT_CHARS),
    author_name: message.author_name,
    channel_name: message.channel_name,
    permalink: message.permalink,
    message_ts: message.message_ts,
  };

  if (includeContext) {
    const before = projectContext(message.context_messages?.before, "last");
    const after = projectContext(message.context_messages?.after, "first");
    if (before) {
      projected.context_before = before;
    }
    if (after) {
      projected.context_after = after;
    }
  }

  return projected;
}

interface SlackContextEntry {
  ts?: string;
  text?: string;
  user_id?: string;
  author_name?: string;
}

interface SlackMessageHit {
  content?: string;
  channel_name?: string;
  author_name?: string;
  permalink?: string;
  message_ts?: string;
  context_messages?: {
    before?: SlackContextEntry[];
    after?: SlackContextEntry[];
  };
}

interface ProjectedContextEntry {
  author_name?: string;
  text: string;
}

interface ProjectedMessage {
  content: string;
  author_name?: string;
  channel_name?: string;
  permalink?: string;
  message_ts?: string;
  context_before?: ProjectedContextEntry[];
  context_after?: ProjectedContextEntry[];
}

/**
 * Slack search via Real-time Search API on the same Connect app as the
 * Slack channel (`slack/agent-c`). Per-user token so ACLs match the caller.
 *
 * Expand the Connect Slack app with granular search scopes
 * (`search:read.public`, `search:read.private`, `search:read.files`,
 * `search:read.users`) — not the legacy `search:read` scope.
 *
 * @see https://docs.slack.dev/reference/methods/assistant.search.context
 */
export default defineTool({
  description:
    "Search Slack messages, files, and channels the signed-in user can access. Use for customer mentions, deal discussions, and case-study context. Prefer public/private channels; do not invent Slack content. Message bodies are truncated — open the permalink's thread with includeContext only when the surrounding conversation matters.",
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
    includeContext: z
      .boolean()
      .optional()
      .describe(
        "Include a few surrounding thread messages per hit. Expensive — these dominate the result size. Only set true when the conversation around a message matters, e.g. resolving a permalink or reconstructing a decision.",
      ),
  }),
  async execute({ query, channelTypes, contentTypes, limit, includeContext }, ctx) {
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
        include_context_messages: includeContext ?? false,
      }),
    });

    if (!res.ok) {
      throw new Error(`Slack search HTTP error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json() as {
      ok: boolean;
      error?: string;
      results?: {
        messages?: SlackMessageHit[];
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
      messages: (data.results?.messages ?? []).map((message) =>
        projectMessage(message, includeContext ?? false),
      ),
      files: (data.results?.files ?? []).map((file) => ({
        title: file.title,
        permalink: file.permalink,
        file_type: file.file_type,
      })),
      channels: (data.results?.channels ?? []).map((channel) => ({
        name: channel.name,
        purpose: trimText(channel.purpose, MAX_CONTENT_CHARS),
        permalink: channel.permalink,
      })),
      nextCursor: data.response_metadata?.next_cursor || undefined,
    };
  },
});

import { connectSlackCredentials } from "@vercel/connect/eve";
import {
  defaultSlackAuth,
  loadThreadContextMessages,
  slackChannel,
  type SlackContext,
} from "eve/channels/slack";

async function slackUserProfile(ctx: SlackContext, userId: string) {
  const res = await ctx.slack.request("users.info", { user: userId });
  if (!res.ok || typeof res.user !== "object" || res.user === null) return null;

  const user = res.user as {
    name?: string;
    real_name?: string;
    profile?: { display_name?: string; real_name?: string; email?: string };
  };

  const displayName =
    user.profile?.display_name?.trim() ||
    user.profile?.real_name?.trim() ||
    user.real_name?.trim() ||
    user.name;

  return {
    userId,
    userName: user.name,
    displayName,
    email: user.profile?.email,
  };
}

export default slackChannel({
  credentials: connectSlackCredentials("slack/adam"),

  async onAppMention(ctx, message) {
    await ctx.thread.startTyping("Thinking…");

    const context: string[] = [];
    const userId = message.author?.userId;

    if (userId) {
      const profile = await slackUserProfile(ctx, userId);
      if (profile?.displayName) {
        context.push(
          [
            "Slack user speaking in this thread:",
            `- Display name: ${profile.displayName}`,
            profile.userName ? `- Username: @${profile.userName}` : null,
            `- User ID: ${profile.userId}`,
            profile.email ? `- Email: ${profile.email}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        );
      }
    }

    const prior = await loadThreadContextMessages(ctx.thread, message, {
      since: "last-agent-reply",
    });
    if (prior.length > 0) {
      const transcript = prior
        .map((m) => `${m.isMe ? "Adam" : (m.user ?? "user")}: ${m.markdown}`)
        .join("\n");
      context.push(`Recent thread messages since your last reply:\n\n${transcript}`);
    }

    return {
      auth: defaultSlackAuth(message, ctx),
      context: context.length > 0 ? context : undefined,
    };
  },
});
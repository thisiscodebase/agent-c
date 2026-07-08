export const queryKeys = {
  profile: ["profile"] as const,
  memory: ["memory"] as const,
  connectors: ["connectors"] as const,
  slackLink: ["slack-link"] as const,
  threads: ["threads"] as const,
  thread: (id: string) => ["threads", id] as const,
};

export const queryKeys = {
  profile: ["profile"] as const,
  publicProfile: (handle: string) => ["public-profile", handle] as const,
  company: ["company"] as const,
  adminAccess: ["admin-access"] as const,
  adminCompany: ["admin-company"] as const,
  adminUser: (handle: string) => ["admin-user", handle] as const,
  memory: ["memory"] as const,
  connectors: ["connectors"] as const,
  slackLink: ["slack-link"] as const,
  threads: ["threads"] as const,
  thread: (id: string) => ["threads", id] as const,
};

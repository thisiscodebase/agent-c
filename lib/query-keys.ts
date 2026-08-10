export const queryKeys = {
  profile: ["profile"] as const,
  publicProfile: (handle: string) => ["public-profile", handle] as const,
  company: ["company"] as const,
  usageMeter: ["usage-meter"] as const,
  adminAccess: ["admin-access"] as const,
  adminCompany: ["admin-company"] as const,
  adminUsageMeters: ["admin-usage-meters"] as const,
  adminUser: (handle: string) => ["admin-user", handle] as const,
  adminTool: (category: string) => ["admin-tool", category] as const,
  memory: ["memory"] as const,
  connectors: ["connectors"] as const,
  slackLink: ["slack-link"] as const,
  threads: ["threads"] as const,
  thread: (id: string) => ["threads", id] as const,
  artifacts: ["artifacts"] as const,
  artifact: (id: string) => ["artifacts", id] as const,
  /** Recent Drive/Notion items for the `@` picker (empty query). */
  composerRefsRecent: (service: string) =>
    ["composer-refs", service, "recent"] as const,
  /** Search hits for the `@` picker. */
  composerRefsSearch: (service: string, query: string) =>
    ["composer-refs", service, "search", query] as const,
  composerSkill: (id: string) => ["composer-skill", id] as const,
  composerRefDetail: (service: string, id: string) =>
    ["composer-ref-detail", service, id] as const,
};

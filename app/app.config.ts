export default defineAppConfig({
  site: {
    name: "CodeBase Agent",
    title: "CodeBase Agent",
    description:
      "Internal lookup-and-synthesis assistant for CodeBase. Chat on the web or Slack — look across Drive, HubSpot, and Slack, and turn it into case studies and reports.",
    tagline: "CodeBase × Eve",
    author: "CodeBase",
    repo: "https://github.com/thisiscodebase/agent-c",
    deployUrl: "https://github.com/thisiscodebase/agent-c",
    ogImage: "/og.png",
    twitter: "",
  },
  ui: {
    colors: {
      primary: "neutral",
      neutral: "neutral",
    },
    button: {
      slots: {
        base: "active:translate-y-px transition-transform duration-200",
      },
      defaultVariants: {
        size: "sm",
      },
    },
  },
});

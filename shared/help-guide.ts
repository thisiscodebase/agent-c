/** End-user help guide shown at /help. */
export const HELP_GUIDE_TITLE = "Using Agent C";

export const HELP_GUIDE_MARKDOWN =
  `Agent C is an internal IT experiment: a chat assistant that can look things up across some of our company tools and draft answers, case studies, and reports.

## Quick start

1. Open a **new chat** from the sidebar (or press ⌘N).
2. Ask in plain language — e.g. “Find recent HubSpot updates for Company X” or “Summarise what we know about Person Y.”
3. Connect the tools you care about under **Settings → Integrations**.
4. It’s better to ask longer or more complicated queries.
5. Ask it to save useful drafts to **Docs** when you want something shareable.

## Chat

- **New chat** — start a fresh thread when the topic changes. Long threads fill the agent's attention span; a new chat keeps answers sharper.
- **Search (⌘K)** — jump to a chat, Settings, leaderboard, etc.
- **Skills** — type \`/\` in chat for shortcuts to powerful tools, like Bid Writer or Case Study modes.
- **Mentions** — type \`@\` to pull in a Drive file, Notion page, HubSpot contact/company, Asana task, or Tally form. You can also paste those links to turn them into rich chips.

## Connectors (Integrations)

**Settings → Integrations**. Everything here is optional.

| Connector | What it does |
| --- | --- |
| **Google Drive** | Search/read Drive files *you* can already access |
| **HubSpot** | CRM companies, deals, contacts |
| **Notion** | Search/read Notion pages and databases *you* can access |
| **Tally** | Forms and submissions |
| **Slack search** | Search Slack with your permissions |
| **CodeBase Platform** | Read-only Platform context (shared service access) |

### Agent C in Slack vs Slack search tool

Two different things:

1. **Slack account link** — **required** to DM / @mention Agent C in Slack (otherwise the bot will ask you to link first). Generate a code in the web app settings, then DM Agent C \`link YOURCODE\`. Linked Slack chats count toward the leaderboard.
2. **Slack search** — separate permission so the *web app* can search Slack for you.

You need the account link to talk to Agent C in Slack. Slack search is optional.

## Docs

Sidebar **Docs** is a scratch library for saved drafts (case studies, reports, notes).

- **Draft** — only you
- **In review** — shared for feedback
- **Published** — treat like other shared company material

## Memory

Sometimes Agent C proposes saving a preference (how you like reports, what you’re focused on). You approve it in chat — nothing is stored without that. Personal memory ≠ the Docs library.

## Usage

There’s a monthly usage cap. You’ll get a warning near the limit; at the cap, new messages pause until next month or an admin raises it.

---

## FAQs

**How do I know how much I've used?**

You can check the **Usage** page in the sidebar to see how many tokens have been used. You can also check the **Docs** page to see the latest documents that have been saved.

**Are my conversations private?**

Your chat threads aren’t a shared company feed. Teammates don’t browse each other’s chats. Admins can see usage numbers and may need access for ops/debugging — same general rule as other internal tools: don’t paste passwords, API keys, or anything you wouldn’t put in Slack.

**Can Agent C do things I can’t?**

For Drive, Notion, HubSpot, and Slack search: no — those connections are yours. If you can’t open the file or see the record, neither can it.

**CodeBase Platform** is different: it uses shared teamwide read-onlyaccess.

**What if I ask about confidential client work?**

Use the same judgment as email or Slack. Prefer Drive/Notion (your permissions) for confidential files. Don’t paste secrets “just in case.” Revoke a connector anytime in Settings if you want it gone.

**Can I turn access off?**

Yes. Revoke the connector or unlink Slack in **Settings → Integrations**.

**What models power Agent C?**

Agent C is not locked to one model, messages go through **Vercel AI Gateway** which is like a broker or marketplace of different models. The live model can change at any time. Typically we use:

- Light chat: OpenAI GPT Luna
- Knowledge work: Anthropic Claude Sonnet, OpenAI Terra or xAI Grok
- Difficult tasks: Anthropic Claude Opus, OpenAI Sol

**Do the model providers train on our chats?**

We send every request with **prompt training disabled** (\`disallowPromptTraining\`). Your Agent C traffic is not opted into provider training.

We also request **zero data retention (ZDR)** on providers that support it via the Gateway.

**Where does data go?**

1. Your browser → Agent C (our internal app / infra)
2. Agent C → model provider via Vercel AI Gateway (for the LLM call)
3. Agent C → connected systems (Drive, Notion, HubSpot, Slack, etc.) only when a tool runs, using that connector’s credentials

Chats and Docs are stored in our database so the product works. Model providers get the prompt/context needed to answer that turn, under the privacy flags above.

**How are connectors secured?**

OAuth (or equivalent) through Vercel Connect where applicable. Per-user connectors (Drive, Notion, HubSpot, Slack search, Tally) keep the source system’s ACLs. Platform uses a shared service token — an explicit trust tradeoff where the agent is part of the access boundary. Users can revoke their own OAuth links anytime.

Message Dylan if you have any questions.
`;

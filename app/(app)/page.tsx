"use client";

import { useEffect, useState } from "react";
import { Suggestion, Suggestions } from "~/components/ai-elements/suggestion";
import { Composer } from "~/components/ui/composer";
import { useChatNavigation } from "~/hooks/chat/use-chat-navigation";
import { getToolCategoryIcon } from "~/lib/tool-icons";
import { cn } from "~/lib/utils";

type Starter = {
  id: string;
  text: string;
  tool: string;
};

const STARTER_POOL: Starter[] = [
  {
    id: "drive-brief",
    tool: "drive",
    text: "Summarize the latest updates in our shared Drive folders",
  },
  {
    id: "drive-deck",
    tool: "drive",
    text: "Find the most recent investor deck in Drive and pull the key metrics",
  },
  {
    id: "hubspot-account",
    tool: "hubspot",
    text: "What's the status of the Acme account in HubSpot?",
  },
  {
    id: "hubspot-pipeline",
    tool: "hubspot",
    text: "Which HubSpot deals moved stage this week?",
  },
  {
    id: "slack-digest",
    tool: "slack",
    text: "Draft a case study from this week's Slack threads",
  },
  {
    id: "slack-decision",
    tool: "slack",
    text: "What decisions were made in #product this week on Slack?",
  },
  {
    id: "notion-brief",
    tool: "notion",
    text: "Find our latest product brief in Notion and summarize open questions",
  },
  {
    id: "tally-responses",
    tool: "tally",
    text: "Summarize the newest Tally form responses and flag outliers",
  },
  {
    id: "platform-sessions",
    tool: "platform",
    text: "Which mentorship sessions are booked for Techscaler this week?",
  },
  {
    id: "platform-companies",
    tool: "platform",
    text: "List companies that still need mentor pairing on the platform",
  },
];

const VISIBLE_COUNT = 2;
const ROTATE_MS = 7000;
const FADE_MS = 350;

function pickPair(offset: number): Starter[] {
  const first = STARTER_POOL[offset % STARTER_POOL.length]!;
  const second = STARTER_POOL[(offset + 1) % STARTER_POOL.length]!;
  return [first, second];
}

export default function HomePage() {
  const { startNewChat } = useChatNavigation();
  const [offset, setOffset] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let fadeTimeout: number | undefined;
    const id = window.setInterval(() => {
      setVisible(false);
      fadeTimeout = window.setTimeout(() => {
        setOffset((current) => (current + VISIBLE_COUNT) % STARTER_POOL.length);
        setVisible(true);
      }, FADE_MS);
    }, ROTATE_MS);

    return () => {
      window.clearInterval(id);
      if (fadeTimeout !== undefined) window.clearTimeout(fadeTimeout);
    };
  }, []);

  const starters = pickPair(offset);

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">🍊 Agent C</h1>
        <p className="text-sm text-muted-foreground">
          Ask about anything across Drive, HubSpot, Slack, and the platform.
        </p>
      </div>

      <Composer
        autoFocus
        className="w-full"
        onSubmit={(message) => {
          if (message.trim()) void startNewChat(message);
        }}
      />

      <Suggestions
        className={cn(
          "min-h-10 transition-opacity duration-300 ease-in-out",
          visible ? "opacity-100" : "opacity-0",
        )}
      >
        {starters.map((starter) => (
          <Suggestion
            key={starter.id}
            icon={getToolCategoryIcon(starter.tool, {
              size: 14,
              showBackground: false,
            })}
            suggestion={starter.text}
            onClick={startNewChat}
          />
        ))}
      </Suggestions>
    </div>
  );
}

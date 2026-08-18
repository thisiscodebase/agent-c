"use client";

import { LayoutGroup } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { EveMessage } from "eve/react";
import type { AgentPrefs } from "#shared/agent-modes";
import { DEFAULT_AGENT_PREFS } from "#shared/agent-modes";
import { createOptimisticUserMessage } from "#shared/optimistic-user-message";
import { Suggestion, Suggestions } from "~/components/ai-elements/suggestion";
import { ChatThreadView } from "~/components/chat/chat-thread-view";
import { DetailPanelHost } from "~/components/detail-panel/detail-panel-host";
import { Composer } from "~/components/ui/composer";
import { useChatNavigation } from "~/hooks/chat/use-chat-navigation";
import {
  clearPendingMessage,
  setPendingMessage,
} from "~/hooks/chat/use-pending-message";
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
    id: "asana-tasks",
    tool: "asana",
    text: "What incomplete Asana tasks are due this week?",
  },
  {
    id: "asana-project",
    tool: "asana",
    text: "Summarize status for our top Asana delivery project",
  },
  {
    id: "retool-apps",
    tool: "retool",
    text: "List our Retool apps and flag anything recently updated",
  },
  {
    id: "retool-resources",
    tool: "retool",
    text: "What data resources are connected in Retool?",
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
  const [agentPrefs, setAgentPrefs] = useState<AgentPrefs>({ ...DEFAULT_AGENT_PREFS });
  const [offset, setOffset] = useState(0);
  const [visible, setVisible] = useState(true);
  const [launch, setLaunch] = useState<{ chatId: string; message: string } | null>(
    null,
  );
  const [restoreValue, setRestoreValue] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (launch) return;

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
  }, [launch]);

  const launchChat = useCallback(
    (message: string) => {
      const text = message.trim();
      if (!text || launch) return;

      const chatId = crypto.randomUUID();
      setRestoreValue(undefined);
      setPendingMessage(chatId, text);
      setLaunch({ chatId, message: text });
      void startNewChat(text, agentPrefs, { chatId }).catch((error) => {
        clearPendingMessage();
        setLaunch(null);
        setRestoreValue(text);
        toast.error(
          error instanceof Error ? error.message : "Failed to start chat",
        );
      });
    },
    [agentPrefs, launch, startNewChat],
  );

  const starters = pickPair(offset);

  return (
    <DetailPanelHost>
      <LayoutGroup id="new-chat-composer">
        {launch ? (
          <div className="h-full min-w-0">
            <ChatThreadView
              agentPrefs={agentPrefs}
              animateInitialUser
              composerDisabled
              messages={[
                createOptimisticUserMessage(
                  launch.message,
                  `pending-user-${launch.chatId}`,
                ) as EveMessage,
              ]}
              onAgentPrefsChange={setAgentPrefs}
              status="submitted"
            />
          </div>
        ) : (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 p-6">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-orange-600">🍊 Agent C</h1>
            </div>

            <Composer
              key={restoreValue ? `restore-${restoreValue}` : "home"}
              agentPrefs={agentPrefs}
              autoFocus
              className="w-full"
              defaultValue={restoreValue}
              onAgentPrefsChange={setAgentPrefs}
              onSubmit={(message) => {
                if (message.trim()) launchChat(message);
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
                  onClick={(text) => launchChat(text)}
                />
              ))}
            </Suggestions>
          </div>
        )}
      </LayoutGroup>
    </DetailPanelHost>
  );
}

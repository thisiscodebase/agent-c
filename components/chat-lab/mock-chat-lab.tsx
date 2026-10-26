"use client";

import { LayoutGroup } from "motion/react";
import { useCallback, useState } from "react";
import type { EveMessage } from "eve/react";
import type { AgentPrefs } from "#shared/agent-modes";
import { DEFAULT_AGENT_PREFS } from "#shared/agent-modes";
import { createOptimisticUserMessage } from "#shared/optimistic-user-message";
import { Suggestion, Suggestions } from "~/components/ai-elements/suggestion";
import {
  chatFooterInputAreaClass,
  chatFooterInteractiveClass,
  chatFooterSpacerWithLabClass,
  chatFloatingFooterClass,
  chatInputColumnClass,
} from "~/components/chat/chat-layout";
import { ChatErrorBanner } from "~/components/chat/chat-error-banner";
import { ChatThreadView } from "~/components/chat/chat-thread-view";
import { MockController } from "~/components/chat-lab/mock-controller";
import { DetailPanelHost } from "~/components/detail-panel/detail-panel-host";
import { Composer } from "~/components/ui/composer";
import { useMockConversation } from "~/hooks/chat/use-mock-conversation";
import { useMockLabHotkeys } from "~/hooks/chat/use-mock-lab-hotkeys";
import { getToolCategoryIcon } from "~/lib/tool-icons";

/**
 * Dev-only chat lab: drives the real ChatThreadView from canned Eve events.
 * Mounted from the home page when `?mock=1`.
 */
export function MockChatLab({
  initialScenarioId,
}: {
  initialScenarioId?: string;
}) {
  const [agentPrefs, setAgentPrefs] = useState<AgentPrefs>({
    ...DEFAULT_AGENT_PREFS,
  });
  const controller = useMockConversation(initialScenarioId);
  useMockLabHotkeys(controller);

  const {
    launched,
    messages,
    status,
    scenario,
    pause,
    play,
    launch,
    respond,
    error,
    playing,
  } = controller;

  const handleSubmit = useCallback(
    (message: string) => {
      const text = message.trim();
      if (!text) {
        launch(scenario.userMessage);
        return;
      }
      launch(text);
    },
    [launch, scenario.userMessage],
  );

  const displayMessages =
    launched && messages.length === 0
      ? ([
          createOptimisticUserMessage(
            scenario.userMessage,
            "mock-pending-user",
          ) as EveMessage,
        ] as const)
      : messages;

  const displayStatus =
    launched && messages.length === 0 && status === "ready"
      ? "submitted"
      : status;

  const hud = <MockController controller={controller} />;

  return (
    <DetailPanelHost>
      <LayoutGroup id="mock-chat-composer">
        {launched ? (
          <div className="h-full min-w-0">
            <ChatThreadView
              animateInitialUser
              composer={
                <Composer
                  agentPrefs={agentPrefs}
                  onAgentPrefsChange={setAgentPrefs}
                  onStop={() => {
                    pause();
                  }}
                  onSubmit={handleSubmit}
                  status={displayStatus}
                />
              }
              footerAfterComposer={hud}
              footerBeforeComposer={
                <ChatErrorBanner error={error} threadId="mock-lab" />
              }
              footerSpacerClass={chatFooterSpacerWithLabClass}
              messages={displayMessages}
              onRespond={respond}
              status={displayStatus}
              threadId="mock-lab"
            />
          </div>
        ) : (
          <div className="relative h-full min-w-0">
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 p-6 pb-36">
              <div className="text-center">
                <h1 className="text-2xl font-semibold text-orange-600">
                  🍊 Agent C
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Mock conversation lab — no tokens used
                </p>
              </div>

              <Composer
                key={scenario.id}
                agentPrefs={agentPrefs}
                autoFocus
                className="w-full"
                defaultValue={scenario.userMessage}
                onAgentPrefsChange={setAgentPrefs}
                onSubmit={handleSubmit}
              />

              <Suggestions className="min-h-10">
                <Suggestion
                  icon={getToolCategoryIcon("platform", {
                    size: 14,
                    showBackground: false,
                  })}
                  suggestion="Play selected scenario"
                  onClick={() => {
                    if (!launched) launch();
                    else if (playing) pause();
                    else play();
                  }}
                />
                <Suggestion
                  icon={getToolCategoryIcon("drive", {
                    size: 14,
                    showBackground: false,
                  })}
                  suggestion={scenario.userMessage}
                  onClick={() => launch(scenario.userMessage)}
                />
              </Suggestions>
            </div>

            <div className={chatFloatingFooterClass}>
              <div className={chatFooterInputAreaClass}>
                <div className={chatFooterInteractiveClass}>
                  <div className={`${chatInputColumnClass} relative flex flex-col gap-2`}>
                    {hud}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </LayoutGroup>
    </DetailPanelHost>
  );
}

export function isChatLabEnabled(searchParams: URLSearchParams | null): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return searchParams?.get("mock") === "1";
}

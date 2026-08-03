"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ThreadRecord } from "#shared/types/thread";
import { ArtifactSidePanel } from "~/components/artifacts/artifact-side-panel";
import { Composer } from "~/components/ui/composer";
import {
  MessageScrollerButton,
  MessageScrollerProvider,
} from "~/components/ui/message-scroller";
import { useArtifactPanel } from "~/hooks/use-artifact-panel";
import { useChatSession } from "~/hooks/chat/use-chat-session";
import {
  resolveTurnOrbActivity,
  shouldShowAgentPresence,
} from "~/lib/orb-activity";
import { cn } from "~/lib/utils";
import {
  chatInputColumnClass,
  chatFloatingFooterClass,
  chatFooterFadeClass,
  chatFooterInputAreaClass,
  chatFooterInteractiveClass,
  chatFooterSolidClass,
} from "./chat-layout";
import { ChatErrorBanner } from "./chat-error-banner";
import { MessageList } from "./message-list";
import { AgentPresence } from "./agent-presence";

export function ChatPageClient({ chatId, initialThread }: { chatId: string; initialThread: ThreadRecord }) {
  const { agent, error } = useChatSession(chatId, initialThread);
  const { openArtifactId, closeArtifact } = useArtifactPanel();
  const reduceMotion = useReducedMotion();

  const showPresence = shouldShowAgentPresence(
    agent.data.messages,
    agent.status,
  );
  const orbActivity = showPresence
    ? resolveTurnOrbActivity(agent.data.messages, agent.status)
    : null;

  function respondToInput(requestId: string, optionId: string) {
    void agent.send({ inputResponses: [{ requestId, optionId }] });
  }

  return (
    <MessageScrollerProvider autoScroll>
      <div className="flex h-full min-w-0">
        <div className="relative min-w-0 flex-1">
          <MessageList
            messages={agent.data.messages}
            onRespond={respondToInput}
            status={agent.status}
            threadId={chatId}
          />

          <div className={chatFloatingFooterClass}>
            <div className="relative">
              <div aria-hidden className={chatFooterFadeClass} />

              {/* Centered dock: presence stays on the midline; scroll control sits to its right when busy. */}
              <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center">
                <div className="relative flex items-center justify-center">
                  <AnimatePresence initial={false}>
                    {orbActivity ? (
                      <motion.div
                        key="agent-presence"
                        initial={
                          reduceMotion ? false : { opacity: 0, y: 8, scale: 0.96 }
                        }
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={
                          reduceMotion
                            ? undefined
                            : { opacity: 0, y: 6, scale: 0.96 }
                        }
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <AgentPresence
                          label={orbActivity.label}
                          paused={orbActivity.state === "listening"}
                          state={orbActivity.state}
                        />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <MessageScrollerButton
                    className={cn(
                      "pointer-events-auto z-10",
                      orbActivity
                        ? [
                            "!absolute !inset-auto !left-full !top-1/2 !ml-2",
                            "!-translate-y-1/2 !translate-x-0",
                            "data-[direction=end]:!bottom-auto",
                            "data-[direction=end]:data-[active=false]:!translate-y-[-40%] data-[direction=end]:data-[active=false]:!translate-x-1",
                          ]
                        : [
                            "!static !inset-auto !translate-x-0",
                            "data-[direction=end]:!bottom-auto",
                            "data-[direction=end]:data-[active=false]:!translate-y-2",
                          ],
                    )}
                  />
                </div>
              </div>
            </div>

            <div className={chatFooterInputAreaClass}>
              <div aria-hidden className={chatFooterSolidClass} />
              <div className={chatFooterInteractiveClass}>
                <ChatErrorBanner error={error} threadId={chatId} />

                <div className={`${chatInputColumnClass} relative`}>
                  <Composer
                    onStop={agent.stop}
                    onSubmit={(message) => {
                      if (message.trim()) void agent.send({ message });
                    }}
                    status={agent.status}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {openArtifactId ? (
          <ArtifactSidePanel artifactId={openArtifactId} onClose={closeArtifact} />
        ) : null}
      </div>
    </MessageScrollerProvider>
  );
}

"use client";

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
  chatInputColumnClass,
  chatFloatingFooterClass,
  chatFooterFadeClass,
  chatFooterInputAreaClass,
  chatFooterInteractiveClass,
  chatFooterSolidClass,
  chatScrollButtonClass,
} from "./chat-layout";
import { ChatErrorBanner } from "./chat-error-banner";
import { MessageList } from "./message-list";

export function ChatPageClient({ chatId, initialThread }: { chatId: string; initialThread: ThreadRecord }) {
  const { agent, error } = useChatSession(chatId, initialThread);
  const { openArtifactId, closeArtifact } = useArtifactPanel();

  function respondToInput(requestId: string, optionId: string) {
    void agent.send({ inputResponses: [{ requestId, optionId }] });
  }

  return (
    <MessageScrollerProvider autoScroll>
      <div className="flex h-full min-w-0">
        <div className="relative min-w-0 flex-1">
          <MessageList messages={agent.data.messages} onRespond={respondToInput} threadId={chatId} />

          <div className={chatFloatingFooterClass}>
            <div className="relative">
              <div aria-hidden className={chatFooterFadeClass} />
              <MessageScrollerButton className={chatScrollButtonClass} />
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

"use client";

import type { ThreadRecord } from "#shared/types/thread";
import { Composer } from "~/components/ui/composer";
import { useChatSession } from "~/hooks/chat/use-chat-session";
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

export function ChatPageClient({ chatId, initialThread }: { chatId: string; initialThread: ThreadRecord }) {
  const { agent } = useChatSession(chatId, initialThread);

  function respondToInput(requestId: string, optionId: string) {
    void agent.send({ inputResponses: [{ requestId, optionId }] });
  }

  return (
    <div className="relative h-full">
      <MessageList messages={agent.data.messages} onRespond={respondToInput} />

      <div className={chatFloatingFooterClass}>
        <div aria-hidden className={chatFooterFadeClass} />

        <div className={chatFooterInputAreaClass}>
          <div aria-hidden className={chatFooterSolidClass} />
          <div className={chatFooterInteractiveClass}>
            <ChatErrorBanner error={agent.error} />

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
  );
}

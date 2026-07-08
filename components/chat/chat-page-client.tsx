"use client";

import type { ThreadRecord } from "#shared/types/thread";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "~/components/ai-elements/prompt-input";
import { useChatSession } from "~/hooks/chat/use-chat-session";
import { ChatErrorBanner } from "./chat-error-banner";
import { MessageList } from "./message-list";

export function ChatPageClient({ chatId, initialThread }: { chatId: string; initialThread: ThreadRecord }) {
  const { agent, isBusy } = useChatSession(chatId, initialThread);

  function respondToInput(requestId: string, optionId: string) {
    void agent.send({ inputResponses: [{ requestId, optionId }] });
  }

  return (
    <div className="flex h-full flex-col">
      <MessageList messages={agent.data.messages} onRespond={respondToInput} />

      <ChatErrorBanner error={agent.error} />

      <div className="border-t p-4">
        <PromptInput
          onSubmit={(message) => {
            if (message.text.trim()) void agent.send({ message: message.text });
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea disabled={isBusy} />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit status={agent.status} onStop={agent.stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

"use client";

import type { EveMessage } from "eve/react";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "~/components/ai-elements/conversation";
import { ChatMessage } from "./chat-message";

export function MessageList({
  messages,
  onRespond,
}: {
  messages: readonly EveMessage[];
  onRespond: (requestId: string, optionId: string) => void;
}) {
  return (
    <Conversation>
      <ConversationContent>
        {messages.length === 0 ? (
          <ConversationEmptyState description="Send a message to get started" title="No messages yet" />
        ) : (
          messages.map((message) => <ChatMessage key={message.id} message={message} onRespond={onRespond} />)
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

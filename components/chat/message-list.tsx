"use client";

import type { EveMessage } from "eve/react";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "~/components/ui/message-scroller";
import { ChatMessage } from "./chat-message";

export function MessageList({
  messages,
  onRespond,
}: {
  messages: readonly EveMessage[];
  onRespond: (requestId: string, optionId: string) => void;
}) {
  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller className="flex-1">
        <MessageScrollerViewport>
          <MessageScrollerContent>
            {messages.length === 0 ? (
              <div className="flex size-full flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="space-y-1">
                  <h3 className="font-medium text-sm">No messages yet</h3>
                  <p className="text-muted-foreground text-sm">Send a message to get started</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <MessageScrollerItem key={message.id} messageId={message.id} scrollAnchor={message.role === "user"}>
                  <ChatMessage message={message} onRespond={onRespond} />
                </MessageScrollerItem>
              ))
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

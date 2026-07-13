"use client";

import type { EveMessage } from "eve/react";
import { cn } from "~/lib/utils";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "~/components/ui/message-scroller";
import { chatMessageColumnClass, chatFooterSpacerClass, chatScrollButtonClass } from "./chat-layout";
import { ChatMessage } from "./chat-message";

export function MessageList({
  messages,
  onRespond,
  threadId,
  className,
}: {
  messages: readonly EveMessage[];
  onRespond: (requestId: string, optionId: string) => void;
  threadId?: string;
  className?: string;
}) {
  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller className={cn("h-full", className)}>
        <MessageScrollerViewport>
          <MessageScrollerContent className={chatFooterSpacerClass}>
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
                  <div className={chatMessageColumnClass}>
                    <ChatMessage message={message} onRespond={onRespond} threadId={threadId} />
                  </div>
                </MessageScrollerItem>
              ))
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton className={chatScrollButtonClass} />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

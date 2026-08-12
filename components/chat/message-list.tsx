"use client";

import type { ChatStatus } from "ai";
import type { EveMessage } from "eve/react";
import { motion, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { userMessageText } from "#shared/optimistic-user-message";
import { cn } from "~/lib/utils";
import { hasVisibleAssistantParts } from "~/lib/orb-activity";
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerViewport,
} from "~/components/ui/message-scroller";
import {
  chatMessageColumnClass,
  chatFooterSpacerClass,
  PENDING_USER_MESSAGE_VT,
} from "./chat-layout";
import { ChatMessage } from "./chat-message";

function messageListKey(messages: readonly EveMessage[], index: number): string {
  const message = messages[index];
  if (!message || message.role !== "user") {
    return message?.id ?? String(index);
  }

  const text = userMessageText(message);
  let ordinal = 0;
  for (let i = 0; i <= index; i += 1) {
    const entry = messages[i];
    if (entry?.role === "user" && userMessageText(entry) === text) {
      ordinal += 1;
    }
  }
  return `user:${ordinal}:${text}`;
}

export function MessageList({
  messages,
  onRespond,
  threadId,
  status,
  className,
  animateInitialUser = false,
}: {
  messages: readonly EveMessage[];
  onRespond: (requestId: string, optionId: string) => void;
  threadId?: string;
  status?: ChatStatus;
  className?: string;
  /** Animate the first user bubble (new-chat launch). Follow-ups always animate. */
  animateInitialUser?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const seenIdsRef = useRef<Set<string> | null>(null);
  const isFirstPass = seenIdsRef.current === null;
  if (seenIdsRef.current === null) {
    seenIdsRef.current = new Set();
  }

  const isBusy = status === "submitted" || status === "streaming";
  const displayMessages = isBusy
    ? messages.filter((message) => {
        if (message.role !== "assistant") return true;
        // Hide empty assistant shells while the turn is starting.
        if (!hasVisibleAssistantParts(message)) return false;
        return true;
      })
    : messages;

  return (
    <MessageScroller className={cn("h-full", className)}>
      <MessageScrollerViewport>
        <MessageScrollerContent className={chatFooterSpacerClass}>
          {displayMessages.length === 0 ? (
            <div className="flex size-full flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="space-y-1">
                <h3 className="font-medium text-sm">No messages yet</h3>
                <p className="text-muted-foreground text-sm">Send a message to get started</p>
              </div>
            </div>
          ) : (
            displayMessages.map((message, index) => {
              const seen = seenIdsRef.current!;
              const listKey = messageListKey(displayMessages, index);
              const isNew = !seen.has(listKey);
              seen.add(listKey);
              const animateUser =
                isNew &&
                message.role === "user" &&
                !reduceMotion &&
                (!isFirstPass || animateInitialUser);
              const pendingFlight = Boolean(message.metadata?.optimistic);

              return (
                <MessageScrollerItem
                  key={listKey}
                  messageId={message.id}
                  scrollAnchor={message.role === "user"}
                >
                  <motion.div
                    className={chatMessageColumnClass}
                    initial={animateUser ? { opacity: 0, y: 28 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    style={
                      pendingFlight
                        ? { viewTransitionName: PENDING_USER_MESSAGE_VT }
                        : undefined
                    }
                    transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ChatMessage
                      message={message}
                      onRespond={onRespond}
                      threadId={threadId}
                    />
                  </motion.div>
                </MessageScrollerItem>
              );
            })
          )}
        </MessageScrollerContent>
      </MessageScrollerViewport>
    </MessageScroller>
  );
}

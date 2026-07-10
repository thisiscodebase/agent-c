"use client";

import type { EveMessage, EveMessagePart } from "eve/react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { Message, MessageContent } from "~/components/ai-elements/message";
import {
  extractCitationsFromMessage,
  getAssistantMarkdown,
  isAssistantMessageComplete,
} from "~/lib/citations";
import { AuthorizationPart } from "./parts/authorization-part";
import { TextPart } from "./parts/text-part";
import { AgentActivityGroup } from "./parts/agent-activity-group";
import { MessageFooter } from "./parts/message-footer";
import type { ActivityItem } from "./parts/activity-types";

type RenderSegment =
  | { kind: "part"; part: EveMessagePart; index: number }
  | { kind: "activity"; items: ActivityItem[]; startIndex: number };

function segmentParts(parts: readonly EveMessagePart[]): RenderSegment[] {
  const segments: RenderSegment[] = [];
  let activityBuffer: ActivityItem[] = [];
  let activityStart = 0;

  const flushActivity = () => {
    if (activityBuffer.length === 0) return;
    segments.push({ kind: "activity", items: activityBuffer, startIndex: activityStart });
    activityBuffer = [];
  };

  parts.forEach((part, index) => {
    if (part.type === "step-start") return;

    if (part.type === "reasoning" || part.type === "dynamic-tool") {
      if (activityBuffer.length === 0) activityStart = index;
      activityBuffer.push(
        part.type === "reasoning"
          ? { kind: "reasoning", part, index }
          : { kind: "tool", part, index },
      );
      return;
    }

    flushActivity();
    segments.push({ kind: "part", part, index });
  });

  flushActivity();
  return segments;
}

export function ChatMessage({
  message,
  onRespond,
}: {
  message: EveMessage;
  onRespond: (requestId: string, optionId: string) => void;
}) {
  const segments = segmentParts(message.parts);
  const citations = useMemo(
    () =>
      message.role === "assistant"
        ? extractCitationsFromMessage(message)
        : [],
    [message],
  );
  const showFooter =
    message.role === "assistant" && isAssistantMessageComplete(message);
  const markdown = useMemo(
    () => (showFooter ? getAssistantMarkdown(message) : ""),
    [message, showFooter],
  );

  return (
    <Message from={message.role}>
      <MessageContent>
        {segments.map((segment): ReactNode => {
          if (segment.kind === "activity") {
            return (
              <AgentActivityGroup
                key={`activity-${segment.startIndex}`}
                items={segment.items}
                onRespond={onRespond}
              />
            );
          }

          const { part, index } = segment;
          switch (part.type) {
            case "text":
              return (
                <TextPart
                  key={index}
                  citations={citations}
                  part={part}
                  role={message.role}
                />
              );
            case "authorization":
              return <AuthorizationPart key={index} part={part} />;
            default:
              return null;
          }
        })}
        {showFooter ? (
          <MessageFooter citations={citations} markdown={markdown} />
        ) : null}
      </MessageContent>
    </Message>
  );
}

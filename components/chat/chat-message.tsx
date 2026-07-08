"use client";

import type { EveMessage } from "eve/react";
import { Message, MessageContent } from "~/components/ai-elements/message";
import { AuthorizationPart } from "./parts/authorization-part";
import { ReasoningPart } from "./parts/reasoning-part";
import { TextPart } from "./parts/text-part";
import { ToolPart } from "./parts/tool-part";

export function ChatMessage({
  message,
  onRespond,
}: {
  message: EveMessage;
  onRespond: (requestId: string, optionId: string) => void;
}) {
  return (
    <Message from={message.role}>
      <MessageContent>
        {message.parts.map((part, index) => {
          switch (part.type) {
            case "text":
              return <TextPart key={index} part={part} />;
            case "reasoning":
              return <ReasoningPart key={index} part={part} />;
            case "authorization":
              return <AuthorizationPart key={index} part={part} />;
            case "dynamic-tool":
              return <ToolPart key={index} onRespond={onRespond} part={part} />;
            case "step-start":
              return null;
            default:
              return null;
          }
        })}
      </MessageContent>
    </Message>
  );
}

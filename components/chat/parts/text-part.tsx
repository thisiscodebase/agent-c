"use client";

import { Bubble, BubbleContent } from "~/components/ui/bubble";
import { MessageResponse } from "~/components/ai-elements/message";
import type { EveMessage, EveMessagePart } from "eve/react";

export function TextPart({
  part,
  role,
}: {
  part: Extract<EveMessagePart, { type: "text" }>;
  role: EveMessage["role"];
}) {
  const response = <MessageResponse isAnimating={part.state === "streaming"}>{part.text}</MessageResponse>;

  if (role !== "user") {
    return response;
  }

  return (
    <Bubble variant="secondary">
      <BubbleContent>{response}</BubbleContent>
    </Bubble>
  );
}

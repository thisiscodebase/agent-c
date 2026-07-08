"use client";

import { Reasoning, ReasoningContent, ReasoningTrigger } from "~/components/ai-elements/reasoning";
import type { EveMessagePart } from "eve/react";

export function ReasoningPart({ part }: { part: Extract<EveMessagePart, { type: "reasoning" }> }) {
  return (
    <Reasoning isStreaming={part.state === "streaming"}>
      <ReasoningTrigger />
      <ReasoningContent>{part.text}</ReasoningContent>
    </Reasoning>
  );
}

"use client";

import { MessageResponse } from "~/components/ai-elements/message";
import type { EveMessagePart } from "eve/react";

export function TextPart({ part }: { part: Extract<EveMessagePart, { type: "text" }> }) {
  return <MessageResponse isAnimating={part.state === "streaming"}>{part.text}</MessageResponse>;
}

"use client";

import type { EveMessage, EveMessagePart } from "eve/react";
import { useMemo } from "react";
import { Streamdown } from "streamdown";
import { Bubble, BubbleContent } from "~/components/ui/bubble";
import { MessageResponse } from "~/components/ai-elements/message";
import {
  streamdownAnimation,
  streamdownPlugins,
} from "~/components/ai-elements/streamdown-config";
import { streamdownLinkSafety } from "~/components/ai-elements/streamdown-link-safety-modal";
import {
  transformCitationMarkdown,
  type Citation,
} from "~/lib/citations";
import { cn } from "~/lib/utils";
import { createCitationComponents } from "./inline-citation";

const EMPTY_CITATIONS: readonly Citation[] = [];

export function TextPart({
  part,
  role,
  citations = EMPTY_CITATIONS,
}: {
  part: Extract<EveMessagePart, { type: "text" }>;
  role: EveMessage["role"];
  citations?: readonly Citation[];
}) {
  const isAssistant = role !== "user";
  const citationComponents = useMemo(
    () => (isAssistant ? createCitationComponents(citations) : undefined),
    [citations, isAssistant],
  );

  const markdown = useMemo(
    () =>
      isAssistant
        ? transformCitationMarkdown(part.text, citations)
        : part.text,
    [citations, isAssistant, part.text],
  );

  if (!isAssistant) {
    return (
      <Bubble variant="imessage">
        <BubbleContent>
          <MessageResponse isAnimating={part.state === "streaming"}>
            {part.text}
          </MessageResponse>
        </BubbleContent>
      </Bubble>
    );
  }

  return (
    <Streamdown
      allowedTags={{
        citation: ["urls"],
        "cite-mark": ["source", "url"],
      }}
      animated={streamdownAnimation}
      className={cn("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0")}
      components={citationComponents}
      isAnimating={part.state === "streaming"}
      linkSafety={streamdownLinkSafety}
      literalTagContent={["cite-mark"]}
      plugins={streamdownPlugins}
    >
      {markdown}
    </Streamdown>
  );
}

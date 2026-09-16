"use client";

import type { EveMessage, EveMessagePart } from "eve/react";
import { useMemo } from "react";
import { Streamdown } from "streamdown";
import {
  extractAttachmentMarkers,
  resolveAttachmentMime,
} from "#shared/types/attachment";
import { Bubble, BubbleContent } from "~/components/ui/bubble";
import { FilePreview } from "~/components/ui/file-preview";
import {
  streamdownAnimation,
  streamdownPlugins,
} from "~/components/ai-elements/streamdown-config";
import { streamdownLinkSafety } from "~/components/ai-elements/streamdown-link-safety-modal";
import {
  transformCitationMarkdown,
  type Citation,
} from "~/lib/citations";
import { unwrapUnsafeMarkdownLinks } from "~/lib/unwrap-unsafe-markdown-links";
import { cn } from "~/lib/utils";
import { createCitationComponents } from "./inline-citation";
import { UserTextWithRefs } from "./user-text-with-refs";

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

  const markdown = useMemo(() => {
    if (!isAssistant) return part.text;
    return unwrapUnsafeMarkdownLinks(
      transformCitationMarkdown(part.text, citations),
    );
  }, [citations, isAssistant, part.text]);

  if (!isAssistant) {
    const { text, attachments } = extractAttachmentMarkers(part.text);
    const files = attachments.map((file) => ({
      id: file.id,
      name: file.name,
      type: resolveAttachmentMime("", file.name) ?? "application/octet-stream",
      url: "",
    }));

    return (
      <div className="flex w-full min-w-0 flex-col items-end gap-2">
        {files.length > 0 ? (
          <FilePreview align="end" files={files} />
        ) : null}
        {text ? (
          <Bubble variant="imessage">
            <BubbleContent className="text-sm">
              <UserTextWithRefs text={text} />
            </BubbleContent>
          </Bubble>
        ) : null}
      </div>
    );
  }

  const streaming = part.state === "streaming";

  return (
    <Streamdown
      allowedTags={{
        citation: ["urls"],
        "cite-mark": ["source", "url"],
      }}
      animated={streamdownAnimation}
      className={cn("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0")}
      components={citationComponents}
      isAnimating={streaming}
      linkSafety={streamdownLinkSafety}
      literalTagContent={["cite-mark"]}
      mode={streaming ? "streaming" : "static"}
      plugins={streamdownPlugins}
    >
      {markdown}
    </Streamdown>
  );
}

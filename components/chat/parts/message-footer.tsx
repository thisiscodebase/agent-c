"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import {
  MessageActions,
  MessageToolbar,
} from "~/components/ai-elements/message";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  getCitationTitle,
  getDomain,
  type Citation,
} from "~/lib/citations";
import { cn } from "~/lib/utils";
import { CitationIcon } from "./citation-icon";
import { ThreadHighlightButton } from "./thread-highlight-button";

const footerActionClassName =
  "inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50";

export function MessageFooter({
  markdown,
  citations,
  threadId,
  messageId,
  className,
}: {
  markdown: string;
  citations: readonly Citation[];
  threadId?: string;
  messageId?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  };

  const stack = citations.slice(0, 3);

  return (
    <MessageToolbar className={cn("mt-2 justify-start gap-1", className)}>
      <MessageActions>
        <button
          className={footerActionClassName}
          disabled={!markdown}
          type="button"
          onClick={() => void handleCopy()}
        >
          {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          <span className="font-medium">{copied ? "Copied" : "Copy"}</span>
        </button>

        {threadId ? (
          <ThreadHighlightButton messageId={messageId} threadId={threadId} />
        ) : null}

        {citations.length > 0 ? (
          <Popover>
            <PopoverTrigger
              className={footerActionClassName}
              type="button"
            >
              <span className="flex items-center">
                {stack.map((citation, index) => (
                  <span
                    className={cn(index > 0 && "-ml-1.5")}
                    key={citation.url}
                    style={{ zIndex: stack.length - index }}
                  >
                    <CitationIcon citation={citation} size={12} stacked />
                  </span>
                ))}
              </span>
              <span className="font-medium">Sources</span>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-2" side="top">
              <div className="mb-1.5 px-1.5 text-xs font-medium text-muted-foreground">
                {citations.length} source{citations.length === 1 ? "" : "s"}
              </div>
              <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
                {citations.map((citation) => (
                  <li key={citation.url}>
                    <a
                      className="flex items-start gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted"
                      href={citation.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <CitationIcon citation={citation} size={14} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-foreground">
                          {getCitationTitle(citation)}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {getDomain(citation.url)}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        ) : null}
      </MessageActions>
    </MessageToolbar>
  );
}

"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import {
  MessageAction,
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

export function MessageFooter({
  markdown,
  citations,
  className,
}: {
  markdown: string;
  citations: readonly Citation[];
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
    <MessageToolbar className={cn("mt-2 gap-2", className)}>
      <MessageActions>
        <MessageAction
          disabled={!markdown}
          label={copied ? "Copied" : "Copy response"}
          tooltip={copied ? "Copied" : "Copy"}
          onClick={() => void handleCopy()}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </MessageAction>
      </MessageActions>

      {citations.length > 0 ? (
        <Popover>
          <PopoverTrigger
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
          <PopoverContent align="end" className="w-80 p-2" side="top">
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
      ) : (
        <span />
      )}
    </MessageToolbar>
  );
}

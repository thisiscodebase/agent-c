"use client";

import { Streamdown } from "streamdown";
import { streamdownPlugins } from "~/components/ai-elements/streamdown-config";
import { streamdownLinkSafety } from "~/components/ai-elements/streamdown-link-safety-modal";
import { cn } from "~/lib/utils";

export function ArtifactMarkdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <Streamdown
      className={cn("w-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}
      linkSafety={streamdownLinkSafety}
      plugins={streamdownPlugins}
    >
      {children}
    </Streamdown>
  );
}

"use client";

import { ArrowUpRightIcon, CheckIcon, CopyIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  ARTIFACT_STATUS_LABELS,
  ARTIFACT_TYPE_LABELS,
  type Artifact,
} from "#shared/types/artifact";
import { ArtifactMarkdown } from "~/components/artifacts/artifact-markdown";
import { Button } from "~/components/ui/button";
import { formatFileDate } from "~/lib/file-system";
import { cn } from "~/lib/utils";

function CopyMarkdownButton({ contentMarkdown }: { contentMarkdown: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(contentMarkdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      aria-label="Copy markdown"
      className="pointer-events-auto text-muted-foreground"
      onClick={() => void copy()}
      size="icon-sm"
      variant="ghost"
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  );
}

/**
 * The document is the page: no chrome, no inner scroller, just a masthead that
 * reads as the first thing written on the paper and a body that runs off the
 * bottom of the screen.
 */
export function ArtifactView({
  artifact,
  onClose,
  showFullPageLink = false,
  className,
}: {
  artifact: Artifact;
  onClose?: () => void;
  showFullPageLink?: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn("h-full overflow-y-auto", className)}
      data-paper={artifact.colour}
    >
      <div className="pointer-events-none sticky top-0 z-10 flex justify-end gap-0.5 p-2">
        <div className="pointer-events-auto flex gap-0.5 rounded-lg bg-background/70 backdrop-blur-sm">
          <CopyMarkdownButton contentMarkdown={artifact.contentMarkdown} />

          {showFullPageLink ? (
            <Button
              aria-label="Open full page"
              className="text-muted-foreground"
              nativeButton={false}
              render={<Link href={`/artifacts/${artifact.id}`} />}
              size="icon-sm"
              variant="ghost"
            >
              <ArrowUpRightIcon />
            </Button>
          ) : null}

          {onClose ? (
            <Button
              aria-label="Close artifact"
              className="text-muted-foreground"
              onClick={onClose}
              size="icon-sm"
              variant="ghost"
            >
              <XIcon />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-6 pt-4 pb-24 text-sm sm:px-10">
        <p className="text-[0.6875rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          {ARTIFACT_TYPE_LABELS[artifact.type]}
          <span className="mx-1.5">·</span>
          {ARTIFACT_STATUS_LABELS[artifact.status]}
          <span className="mx-1.5">·</span>
          {formatFileDate(artifact.updatedAt)}
        </p>

        <h1 className="mt-3 mb-8 font-heading text-3xl leading-[1.15] font-medium tracking-tight text-balance sm:text-4xl">
          {artifact.title}
        </h1>

        <ArtifactMarkdown>{artifact.contentMarkdown}</ArtifactMarkdown>
      </div>
    </article>
  );
}

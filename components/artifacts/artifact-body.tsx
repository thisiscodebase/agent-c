"use client";

import { AlertTriangleIcon } from "lucide-react";
import { ArtifactChart } from "~/components/artifacts/artifact-chart";
import { ArtifactMarkdown } from "~/components/artifacts/artifact-markdown";
import { stripLeadingTitleHeading } from "#shared/types/artifact";
import { parseArtifactBlocks } from "#shared/types/artifact-chart";
import { cn } from "~/lib/utils";

/**
 * Artifact body that keeps prose on Streamdown and hydrates ```chart fences
 * into dither-kit charts.
 */
export function ArtifactBody({
  contentMarkdown,
  title,
  className,
}: {
  contentMarkdown: string;
  /** When set, a leading `#` that duplicates the cover title is dropped. */
  title?: string;
  className?: string;
}) {
  const body = title
    ? stripLeadingTitleHeading(contentMarkdown, title)
    : contentMarkdown;
  const blocks = parseArtifactBlocks(body);

  return (
    <div className={cn("flex flex-col", className)}>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "markdown":
            return (
              <ArtifactMarkdown key={`md-${index}`}>
                {block.content}
              </ArtifactMarkdown>
            );
          case "chart":
            return <ArtifactChart key={`chart-${index}`} spec={block.spec} />;
          case "chart-error":
            return (
              <div
                className="my-4 flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
                key={`chart-error-${index}`}
              >
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Could not render chart</p>
                  <p className="text-xs">{block.message}</p>
                </div>
              </div>
            );
          default: {
            const _exhaustive: never = block;
            return _exhaustive;
          }
        }
      })}
    </div>
  );
}

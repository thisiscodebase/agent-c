"use client";

import type { ArtifactColour } from "#shared/types/artifact";
import type { LeadingArtifactVisual } from "#shared/types/artifact-chart";
import { DocumentCoverVisual } from "~/components/artifacts/document-thumbnail";
import { cn } from "~/lib/utils";

/**
 * Chat-inline cover: portrait paper sheet — full title, first summary line,
 * optional leading visual. Sharp corners, slight tilt + shadow for physical paper.
 */
export function ArtifactCoverCard({
  title,
  colour,
  summaryLine,
  leadingVisual,
  onOpen,
  className,
}: {
  title: string;
  colour: ArtifactColour;
  summaryLine?: string;
  leadingVisual?: LeadingArtifactVisual;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      className={cn(
        "not-prose group mb-4 w-fit max-w-full origin-center cursor-pointer p-3 text-left",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
      onClick={onOpen}
      type="button"
    >
      <div
        className={cn(
          "flex aspect-[3/4] w-52 flex-col gap-2.5 overflow-hidden rounded-none border border-border/60 p-3.5 sm:w-56",
          "-rotate-1 skew-x-[0.6deg] shadow-[3px_6px_16px_rgb(0_0_0/0.14),1px_2px_4px_rgb(0_0_0/0.08)]",
          "transition-[transform,box-shadow] duration-200",
          "group-hover:rotate-0 group-hover:skew-x-0 group-hover:shadow-[4px_10px_24px_rgb(0_0_0/0.16),1px_3px_6px_rgb(0_0_0/0.1)]",
          "group-focus-visible:rotate-0 group-focus-visible:skew-x-0",
        )}
        data-paper={colour}
      >
        <h2 className="shrink-0 font-artifact-title text-lg leading-[1.2] font-normal text-balance text-foreground italic sm:text-xl">
          {title}
        </h2>

        {summaryLine ? (
          <p className="shrink-0 text-xs leading-relaxed text-foreground/70 sm:text-[0.8125rem]">
            {summaryLine}
          </p>
        ) : null}

        {leadingVisual ? (
          <div className="mt-auto h-20 w-full shrink-0 sm:h-24">
            <DocumentCoverVisual className="size-full" visual={leadingVisual} />
          </div>
        ) : (
          <div className="min-h-0 flex-1" />
        )}
      </div>
    </button>
  );
}

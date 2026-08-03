"use client";

import type { ReactNode } from "react";
import type { ArtifactColour } from "#shared/types/artifact";
import type { LeadingArtifactVisual } from "#shared/types/artifact-chart";
import { ArtifactChartPlot } from "~/components/artifacts/artifact-chart";
import { cn } from "~/lib/utils";

function ThumbnailVisual({
  visual,
  className,
}: {
  visual: LeadingArtifactVisual;
  className?: string;
}) {
  switch (visual.kind) {
    case "chart":
      return (
        <div className={cn("pointer-events-none min-h-0 flex-1", className)}>
          <ArtifactChartPlot compact spec={visual.spec} />
        </div>
      );
    case "image":
      return (
        // Markdown image URLs are arbitrary hosts; native img is intentional.
        <img
          alt={visual.alt || ""}
          className={cn("min-h-0 flex-1 object-cover object-top", className)}
          src={visual.src}
        />
      );
    default: {
      const _exhaustive: never = visual;
      return _exhaustive;
    }
  }
}

/** Leading chart or image for cover cards and Docs tiles. */
export function DocumentCoverVisual({
  visual,
  className,
}: {
  visual: LeadingArtifactVisual;
  className?: string;
}) {
  return <ThumbnailVisual className={className} visual={visual} />;
}

/**
 * Miniature document cover — paper stock with the real title, plus a leading
 * chart or image when the body opens with one (Extend `previewContent` pattern).
 */
export function DocumentThumbnail({
  colour,
  title,
  leadingVisual,
  className,
}: {
  colour: ArtifactColour;
  title: string;
  leadingVisual?: LeadingArtifactVisual;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-full flex-col overflow-hidden p-1.5 text-left",
        className,
      )}
      data-paper={colour}
    >
      <p
        className={
          leadingVisual
            ? "line-clamp-2 font-artifact-title text-[calc(0.6rem+1px)] leading-[1.15] font-normal text-foreground italic"
            : "line-clamp-5 font-artifact-title text-[calc(0.7rem+1px)] leading-[1.15] font-normal text-foreground italic"
        }
      >
        {title}
      </p>
      {leadingVisual ? <ThumbnailVisual className="mt-1" visual={leadingVisual} /> : null}
    </div>
  );
}

/** Frame matching the Docs icons view file tile. */
export function DocumentThumbnailFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-28 w-[5.5rem] overflow-hidden rounded-sm border border-border/70 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

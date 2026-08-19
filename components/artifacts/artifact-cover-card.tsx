"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { ArtifactColour } from "#shared/types/artifact";
import type { LeadingArtifactVisual } from "#shared/types/artifact-chart";
import { DocumentCoverVisual } from "~/components/artifacts/document-thumbnail";
import { cn } from "~/lib/utils";

const COVER_FRAME_CLASS =
  "not-prose mb-2 w-fit max-w-full origin-center overflow-visible px-5 pt-3 pb-14 text-left";

const COVER_PAPER_CLASS =
  "relative flex aspect-[3/4] w-52 origin-center flex-col gap-2.5 overflow-hidden rounded-none border border-border/60 p-3.5 sm:w-56";

const PAPER_SHADOW_REST =
  "3px 6px 16px rgb(0 0 0 / 0.14), 1px 2px 4px rgb(0 0 0 / 0.08)";
const PAPER_SHADOW_LIFT =
  "5px 16px 36px rgb(0 0 0 / 0.2), 1px 5px 10px rgb(0 0 0 / 0.1)";
const PAPER_SHADOW_HOVER =
  "4px 10px 24px rgb(0 0 0 / 0.16), 1px 3px 6px rgb(0 0 0 / 0.1)";

const REST_POSE = {
  rotate: -1,
  skewX: 0.6,
  y: 0,
  boxShadow: PAPER_SHADOW_REST,
};

const FLOAT_POSE = {
  rotate: [-1.55, -0.4, -1.55],
  skewX: [1.5, -0.4, 1.5],
  y: [0, -5, 0],
  boxShadow: [PAPER_SHADOW_REST, PAPER_SHADOW_LIFT, PAPER_SHADOW_REST],
};

const FLAT_POSE = {
  rotate: 0,
  skewX: 0,
  y: 0,
  boxShadow: PAPER_SHADOW_HOVER,
};

const FLOAT_EASE = [0.45, 0, 0.55, 1] as const;
const SETTLE_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Chat-inline cover: portrait paper sheet — full title, first summary line,
 * optional leading visual. Sharp corners, slight tilt + shadow for physical paper.
 */
export function ArtifactCoverCard({
  title,
  colour = "white",
  summaryLine,
  leadingVisual,
  onOpen,
  pending = false,
  className,
}: {
  title?: string;
  colour?: ArtifactColour;
  summaryLine?: string;
  leadingVisual?: LeadingArtifactVisual;
  onOpen?: () => void;
  pending?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [flatten, setFlatten] = useState(false);
  const displayTitle = title?.trim() || (pending ? "Writing document…" : "");
  const interactive = Boolean(onOpen) && !pending;

  return (
    <button
      aria-busy={pending || undefined}
      aria-live={pending ? "polite" : undefined}
      className={cn(
        COVER_FRAME_CLASS,
        interactive
          ? "group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          : "cursor-default",
        className,
      )}
      onBlur={() => setFlatten(false)}
      onClick={interactive ? onOpen : undefined}
      onFocus={() => {
        if (interactive) setFlatten(true);
      }}
      onPointerEnter={() => {
        if (interactive) setFlatten(true);
      }}
      onPointerLeave={() => setFlatten(false)}
      tabIndex={interactive ? 0 : -1}
      type="button"
    >
      <motion.div
        animate={
          reduceMotion
            ? { opacity: 1, ...REST_POSE }
            : pending
              ? { opacity: 1, ...FLOAT_POSE }
              : flatten
                ? { opacity: 1, ...FLAT_POSE }
                : { opacity: 1, ...REST_POSE }
        }
        className={cn(
          COVER_PAPER_CLASS,
          pending && !reduceMotion && "artifact-pending-cycle",
        )}
        data-paper={pending ? (reduceMotion ? "white" : undefined) : colour}
        initial={reduceMotion ? false : { opacity: 0, ...REST_POSE }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : pending
              ? {
                  opacity: { duration: 0.55, ease: SETTLE_EASE },
                  rotate: { duration: 2.8, repeat: Infinity, ease: FLOAT_EASE },
                  skewX: { duration: 3.4, repeat: Infinity, ease: FLOAT_EASE },
                  y: { duration: 2.8, repeat: Infinity, ease: FLOAT_EASE },
                  boxShadow: { duration: 2.8, repeat: Infinity, ease: FLOAT_EASE },
                }
              : { duration: flatten ? 0.22 : 0.65, ease: SETTLE_EASE }
        }
      >
        <h2 className="shrink-0 font-artifact-title text-lg leading-[1.2] font-normal text-balance italic sm:text-xl text-foreground">
          {displayTitle}
        </h2>

        {summaryLine ? (
          <p className="shrink-0 text-xs leading-relaxed text-foreground/70 sm:text-[0.8125rem]">
            {summaryLine}
          </p>
        ) : pending ? (
          <div aria-hidden className="flex flex-col gap-2 pt-1">
            <span className="h-2 w-[92%] rounded-sm bg-foreground/10" />
            <span className="h-2 w-[78%] rounded-sm bg-foreground/10" />
            <span className="h-2 w-[64%] rounded-sm bg-foreground/8" />
          </div>
        ) : null}

        {leadingVisual ? (
          <div className="mt-auto h-20 w-full shrink-0 sm:h-24">
            <DocumentCoverVisual className="size-full" visual={leadingVisual} />
          </div>
        ) : (
          <div className="min-h-0 flex-1" />
        )}
      </motion.div>
    </button>
  );
}

/** In-progress cover: same paper geometry, continuous stock cycle + text shimmer. */
export function ArtifactPendingCover({
  title,
  summaryLine,
}: {
  title?: string;
  summaryLine?: string;
}) {
  return <ArtifactCoverCard pending summaryLine={summaryLine} title={title} />;
}

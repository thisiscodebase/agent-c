"use client";

import { GlobeIcon } from "lucide-react";
import { useState } from "react";
import type { Citation, CitationSource } from "~/lib/citations";
import { getCitationTintClass, getFaviconUrl } from "~/lib/citations";
import { getBrandImgClass } from "~/lib/tool-icons";
import { cn } from "~/lib/utils";

const BRAND_ICONS: Partial<
  Record<CitationSource, { src: string; alt: string }>
> = {
  hubspot: { src: "/icons/hubspot.svg", alt: "HubSpot" },
  notion: { src: "/icons/notion.svg", alt: "Notion" },
  slack: { src: "/icons/slack.svg", alt: "Slack" },
  drive: { src: "/icons/drive.svg", alt: "Google Drive" },
  tally: { src: "/icons/tally.svg", alt: "Tally" },
};

export function CitationIcon({
  citation,
  size = 14,
  className,
  stacked = false,
  showBackground = true,
}: {
  citation: Citation;
  size?: number;
  className?: string;
  /** Overlapping stack style for footer / multi-source pills. */
  stacked?: boolean;
  showBackground?: boolean;
}) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const brand = BRAND_ICONS[citation.source];
  const tint = getCitationTintClass(citation.source);
  const imgClass = getBrandImgClass(citation.source);

  if (brand) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full",
          showBackground ? tint : undefined,
          stacked && "ring-2 ring-background",
          className,
        )}
        style={{ width: size + 4, height: size + 4 }}
      >
        <img
          alt={brand.alt}
          className={cn("object-contain", imgClass)}
          height={size}
          src={brand.src}
          width={size}
        />
      </span>
    );
  }

  if (faviconFailed) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full",
          showBackground ? tint : undefined,
          stacked && "ring-2 ring-background",
          className,
        )}
        style={{ width: size + 4, height: size + 4 }}
      >
        <GlobeIcon className="text-muted-foreground" size={Math.max(10, size - 2)} />
      </span>
    );
  }

  return (
    <img
      alt=""
      className={cn(
        "inline-block shrink-0 rounded-full object-contain",
        showBackground ? tint : "bg-muted",
        stacked && "ring-2 ring-background",
        className,
      )}
      height={size + 2}
      src={getFaviconUrl(citation.url)}
      width={size + 2}
      onError={() => setFaviconFailed(true)}
    />
  );
}

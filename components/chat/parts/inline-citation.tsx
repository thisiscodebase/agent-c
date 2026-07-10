"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  findCitationForUrl,
  getCitationLabel,
  getCitationTintClass,
  getCitationTitle,
  getDomain,
  type Citation,
  type CitationSource,
} from "~/lib/citations";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/components/ui/hover-card";
import { cn } from "~/lib/utils";
import { CitationIcon } from "./citation-icon";

function resolveCitations(
  urlsAttr: string | undefined,
  catalog: readonly Citation[],
): Citation[] {
  if (!urlsAttr) return [];
  return urlsAttr
    .split("|||")
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => findCitationForUrl(url, catalog))
    .filter((c): c is Citation => c != null);
}

function CitationHoverList({ citations }: { citations: Citation[] }) {
  return (
    <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
      {citations.map((citation) => (
        <li key={citation.url}>
          <a
            className="flex items-start gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-muted"
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
  );
}

/** Highlighted body text that keeps the original link label readable. */
export function CitationMark({
  source,
  url,
  children,
  className,
}: {
  source?: string;
  url?: string;
  children?: ReactNode;
  className?: string;
}) {
  const tintSource = (source as CitationSource | undefined) ?? "unknown";
  const tint = getCitationTintClass(tintSource);

  const mark = (
    <span
      className={cn(
        "rounded-[0.2em] px-0.5 py-px text-foreground no-underline",
        tint,
        className,
      )}
    >
      {children}
    </span>
  );

  if (!url) return mark;

  return (
    <a
      className="text-foreground no-underline"
      href={url}
      rel="noreferrer"
      target="_blank"
    >
      {mark}
    </a>
  );
}

/** Compact source chip rendered at the end of a sentence/clause. */
export function InlineCitationPill({
  citations,
  className,
}: {
  citations: Citation[];
  className?: string;
}) {
  if (citations.length === 0) return null;

  const primary = citations[0]!;
  const extra = citations.length - 1;
  const label = getCitationLabel(primary);
  const tint = getCitationTintClass(primary.source);

  const pill = (
    <span
      className={cn(
        "ml-1 inline-flex max-w-[12rem] translate-y-[-1px] items-center gap-1 rounded-full px-1.5 py-0.5 align-middle text-[11px] leading-none text-foreground/80 no-underline transition-opacity hover:opacity-90",
        tint,
        className,
      )}
    >
      <CitationIcon citation={primary} showBackground={false} size={12} />
      <span className="truncate font-medium">{label}</span>
      {extra > 0 ? (
        <span className="shrink-0 text-foreground/60">+{extra}</span>
      ) : null}
    </span>
  );

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <a
            className="inline no-underline"
            href={primary.url}
            rel="noreferrer"
            target="_blank"
          />
        }
      >
        {pill}
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-72 p-2" side="top">
        <CitationHoverList citations={citations} />
      </HoverCardContent>
    </HoverCard>
  );
}

export function createCitationComponents(catalog: readonly Citation[]) {
  return {
    "cite-mark": ({
      source,
      url,
      children,
    }: ComponentProps<"span"> & { source?: string; url?: string }) => (
      <CitationMark source={source} url={url}>
        {children}
      </CitationMark>
    ),
    citation: ({ urls }: ComponentProps<"span"> & { urls?: string }) => {
      const citations = resolveCitations(urls, catalog);
      if (citations.length === 0) return null;
      return <InlineCitationPill citations={citations} />;
    },
  };
}

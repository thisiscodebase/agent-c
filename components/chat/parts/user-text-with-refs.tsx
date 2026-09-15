"use client";

import { ATTACHMENT_MARKER_RE, unescapeAttachmentMarkerName } from "#shared/types/attachment";
import {
  COMPOSER_REF_MARKER_RE,
  getComposerRefService,
  type ComposerRefService,
} from "#shared/composer-refs";
import { PaperclipIcon } from "lucide-react";
import { refMentionColorClass } from "~/components/ui/composer-ref-chips";
import { useDetailPanel } from "~/hooks/use-detail-panel";
import { cn } from "~/lib/utils";

type TextSegment =
  | { type: "text"; value: string }
  | {
      type: "ref";
      service: ComposerRefService;
      id: string;
      name: string;
    }
  | {
      type: "attachment";
      id: string;
      name: string;
    };

type MarkerMatch = {
  index: number;
  length: number;
  segment: Exclude<TextSegment, { type: "text" }>;
};

function unescapeRefName(name: string): string {
  return name.replace(/\\([\\|\\\]])/g, "$1");
}

function collectMarkers(text: string): MarkerMatch[] {
  const matches: MarkerMatch[] = [];

  for (const match of text.matchAll(new RegExp(COMPOSER_REF_MARKER_RE.source, "g"))) {
    const index = match.index ?? 0;
    const service = match[1] as ComposerRefService;
    const id = match[2] ?? "";
    const name = unescapeRefName(match[3] ?? "");
    if (!id || !name) continue;
    matches.push({
      index,
      length: match[0]?.length ?? 0,
      segment: { type: "ref", service, id, name },
    });
  }

  for (const match of text.matchAll(new RegExp(ATTACHMENT_MARKER_RE.source, "g"))) {
    const index = match.index ?? 0;
    const id = match[1] ?? "";
    const name = unescapeAttachmentMarkerName(match[2] ?? "");
    if (!id || !name) continue;
    matches.push({
      index,
      length: match[0]?.length ?? 0,
      segment: { type: "attachment", id, name },
    });
  }

  return matches.sort((a, b) => a.index - b.index);
}

function splitSegments(text: string): TextSegment[] {
  const markers = collectMarkers(text);
  if (markers.length === 0) {
    return [{ type: "text", value: text }];
  }

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const marker of markers) {
    if (marker.index < lastIndex) {
      continue;
    }
    if (marker.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, marker.index) });
    }
    segments.push(marker.segment);
    lastIndex = marker.index + marker.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}

/** Render user-message text with `[[ref:...]]` and `[[attachment:...]]` chips. */
export function UserTextWithRefs({ text }: { text: string }) {
  const segments = splitSegments(text);
  const { openRef } = useDetailPanel();

  return (
    <span className="whitespace-pre-wrap break-words">
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={`t-${index}-${segment.value.slice(0, 12)}`}>{segment.value}</span>;
        }

        if (segment.type === "attachment") {
          return (
            <span
              key={`a-${segment.id}-${segment.name}`}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-sm bg-muted/80 px-1 py-0.5 text-[0.95em] text-foreground"
              title={segment.name}
            >
              <PaperclipIcon className="size-3 shrink-0 opacity-70" />
              {segment.name}
            </span>
          );
        }

        const meta = getComposerRefService(segment.service);
        return (
          <button
            key={`r-${segment.service}-${segment.id}-${index}`}
            className={cn(
              "ref-mention inline cursor-pointer whitespace-nowrap",
              refMentionColorClass(segment.service),
              "rounded-sm hover:underline",
            )}
            data-service={segment.service}
            title={`${meta?.label ?? segment.service}: ${segment.name}`}
            type="button"
            onClick={() => openRef(segment.service, segment.id, segment.name)}
          >
            {meta ? (
              <img
                alt=""
                className="mr-1 inline-block size-[1em] align-[-0.125em] object-contain"
                height={16}
                src={meta.iconSrc}
                width={16}
              />
            ) : null}
            @{segment.name}
          </button>
        );
      })}
    </span>
  );
}

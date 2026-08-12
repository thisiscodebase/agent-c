"use client";

import {
  COMPOSER_REF_MARKER_RE,
  getComposerRefService,
  type ComposerRefService,
} from "#shared/composer-refs";
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
    };

function unescapeRefName(name: string): string {
  return name.replace(/\\([\\|\\\]])/g, "$1");
}

function splitRefSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const re = new RegExp(COMPOSER_REF_MARKER_RE.source, "g");
  let lastIndex = 0;

  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, index) });
    }
    const service = match[1] as ComposerRefService;
    const id = match[2] ?? "";
    const name = unescapeRefName(match[3] ?? "");
    if (id && name) {
      segments.push({ type: "ref", service, id, name });
    } else {
      segments.push({ type: "text", value: match[0] ?? "" });
    }
    lastIndex = index + (match[0]?.length ?? 0);
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}

/** Render user-message text with `[[ref:...]]` markers as @chips. */
export function UserTextWithRefs({ text }: { text: string }) {
  const segments = splitRefSegments(text);
  const { openRef } = useDetailPanel();

  return (
    <span className="whitespace-pre-wrap break-words">
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={`t-${index}`}>{segment.value}</span>;
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

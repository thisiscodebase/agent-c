"use client";

import { AlertTriangleIcon, ArrowUpRightIcon, XIcon } from "lucide-react";
import { getComposerRefService } from "#shared/composer-refs";
import { ArtifactMarkdown } from "~/components/artifacts/artifact-markdown";
import { ArtifactView } from "~/components/artifacts/artifact-view";
import { Button } from "~/components/ui/button";
import { refMentionColorClass } from "~/components/ui/composer-ref-chips";
import { SKILL_MENTION_COLOR } from "~/components/ui/composer-skill-chips";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "~/components/ui/sheet";
import { Spinner } from "~/components/ui/spinner";
import { useArtifact } from "~/hooks/use-artifact";
import {
  useComposerRefDetail,
  useComposerSkillDetail,
} from "~/hooks/use-composer-detail";
import type { DetailPanel } from "~/hooks/use-detail-panel";
import { useMediaQuery } from "~/hooks/use-media-query";
import { usePanelResize } from "~/hooks/use-panel-resize";
import { formatFileDate } from "~/lib/file-system";
import { cn } from "~/lib/utils";

const DESKTOP_QUERY = "(min-width: 768px)";

/** White/black paper for skill & ref panels (not artifact tint stocks). */
const MENTION_PANEL_SURFACE = "bg-white dark:bg-black";
const MENTION_PANEL_CHROME =
  "rounded-lg bg-white/80 backdrop-blur-sm dark:bg-black/80";

function PanelPlaceholder({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose?: () => void;
}) {
  const body = (
    <div className="flex h-full items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
      {children}
    </div>
  );
  if (!onClose) return body;
  return <PanelChrome onClose={onClose}>{body}</PanelChrome>;
}

function PanelChrome({
  onClose,
  externalHref,
  externalLabel,
  children,
  className,
}: {
  onClose: () => void;
  externalHref?: string;
  externalLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "h-full overflow-y-auto",
        MENTION_PANEL_SURFACE,
        className,
      )}
    >
      <div className="pointer-events-none sticky top-0 z-10 flex items-start justify-end gap-0.5 p-2">
        <div className={cn("pointer-events-auto flex gap-0.5", MENTION_PANEL_CHROME)}>
          {externalHref ? (
            <Button
              aria-label={externalLabel ?? "Open externally"}
              className="text-muted-foreground"
              nativeButton={false}
              render={
                <a href={externalHref} rel="noopener noreferrer" target="_blank" />
              }
              size="icon-sm"
              variant="ghost"
            >
              <ArrowUpRightIcon />
            </Button>
          ) : null}
          <Button
            aria-label="Close panel"
            className="text-muted-foreground"
            onClick={onClose}
            size="icon-sm"
            variant="ghost"
          >
            <XIcon />
          </Button>
        </div>
      </div>
      {children}
    </article>
  );
}

function ArtifactPanelBody({
  artifactId,
  onClose,
}: {
  artifactId: string;
  onClose: () => void;
}) {
  const { artifact, isLoading, error } = useArtifact(artifactId);

  if (isLoading) {
    return (
      <PanelPlaceholder onClose={onClose}>
        <Spinner className="size-4" />
        Loading artifact…
      </PanelPlaceholder>
    );
  }

  if (error || !artifact) {
    return (
      <PanelPlaceholder onClose={onClose}>
        <AlertTriangleIcon className="size-4" />
        {error instanceof Error ? error.message : "Artifact not found"}
      </PanelPlaceholder>
    );
  }

  return (
    <ArtifactView
      artifact={artifact}
      onClose={onClose}
      showFullPageLink
    />
  );
}

function SkillPanelBody({
  skillId,
  onClose,
}: {
  skillId: string;
  onClose: () => void;
}) {
  const { skill, isLoading, error } = useComposerSkillDetail(skillId);

  if (isLoading) {
    return (
      <PanelPlaceholder onClose={onClose}>
        <Spinner className="size-4" />
        Loading skill…
      </PanelPlaceholder>
    );
  }

  if (error || !skill) {
    return (
      <PanelPlaceholder onClose={onClose}>
        <AlertTriangleIcon className="size-4" />
        {error instanceof Error ? error.message : "Skill not found"}
      </PanelPlaceholder>
    );
  }

  return (
    <PanelChrome onClose={onClose}>
      <div className="mx-auto w-full max-w-2xl px-6 pt-4 pb-24 text-sm sm:px-10">
        <h1
          className={cn(
            "mt-0 mb-3 font-artifact-title text-4xl leading-[1.1] font-normal tracking-tight text-balance italic sm:text-5xl",
            SKILL_MENTION_COLOR,
          )}
        >
          {skill.label}
        </h1>
        <p className="mb-8 text-muted-foreground">{skill.description}</p>
        <ArtifactMarkdown>{skill.bodyMarkdown}</ArtifactMarkdown>
      </div>
    </PanelChrome>
  );
}

function RefPanelBody({
  service,
  id,
  name,
  onClose,
}: {
  service: "drive" | "notion" | "hubspot" | "asana" | "tally";
  id: string;
  name?: string;
  onClose: () => void;
}) {
  const { item, isLoading, error } = useComposerRefDetail(service, id, name);
  const meta = getComposerRefService(service);

  if (isLoading) {
    return (
      <PanelPlaceholder onClose={onClose}>
        <Spinner className="size-4" />
        Loading {meta?.label ?? service}…
      </PanelPlaceholder>
    );
  }

  if (error || !item) {
    return (
      <PanelPlaceholder onClose={onClose}>
        <AlertTriangleIcon className="size-4" />
        {error instanceof Error ? error.message : "Item not found"}
      </PanelPlaceholder>
    );
  }

  const body =
    item.bodyMarkdown?.trim() ||
    (item.bodyText
      ? ["```", item.bodyText, "```"].join("\n")
      : item.bodyNote
        ? `_${item.bodyNote}_`
        : "_No preview available._");

  const dateBits = [
    item.author ? `by ${item.author}` : null,
    item.modifiedAt
      ? `updated ${formatFileDate(item.modifiedAt)}`
      : item.createdAt
        ? `created ${formatFileDate(item.createdAt)}`
        : null,
  ].filter(Boolean);

  return (
    <PanelChrome
      externalHref={item.url}
      externalLabel={`Open in ${meta?.label ?? service}`}
      onClose={onClose}
    >
      <div className="mx-auto w-full max-w-2xl px-6 pt-4 pb-24 text-sm sm:px-10">
        <p className="text-xs text-muted-foreground">
          {meta?.label ?? service}
          {dateBits.length ? ` · ${dateBits.join(" · ")}` : null}
        </p>
        <h1
          className={cn(
            "mt-3 mb-8 font-artifact-title text-4xl leading-[1.1] font-normal tracking-tight text-balance italic sm:text-5xl",
            refMentionColorClass(service),
          )}
        >
          {item.name}
        </h1>
        <ArtifactMarkdown>{body}</ArtifactMarkdown>
      </div>
    </PanelChrome>
  );
}

function PanelBody({
  panel,
  onClose,
}: {
  panel: DetailPanel;
  onClose: () => void;
}) {
  switch (panel.type) {
    case "artifact":
      return <ArtifactPanelBody artifactId={panel.id} onClose={onClose} />;
    case "skill":
      return <SkillPanelBody skillId={panel.id} onClose={onClose} />;
    case "ref":
      return (
        <RefPanelBody
          id={panel.id}
          name={panel.name}
          onClose={onClose}
          service={panel.service}
        />
      );
    default: {
      const _exhaustive: never = panel;
      return _exhaustive;
    }
  }
}

function panelAriaLabel(panel: DetailPanel): string {
  switch (panel.type) {
    case "artifact":
      return "Artifact";
    case "skill":
      return "Skill";
    case "ref":
      return getComposerRefService(panel.service)?.label ?? "Reference";
    default: {
      const _exhaustive: never = panel;
      return _exhaustive;
    }
  }
}

/**
 * Docked beside the conversation on desktop, an overlay sheet on mobile.
 * Shared shell for artifacts, skills, and Drive/Notion refs.
 */
export function DetailSidePanel({
  panel,
  onClose,
}: {
  panel: DetailPanel;
  onClose: () => void;
}) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const { width, startResize, onKeyDown, minWidth, maxWidth } = usePanelResize({
    storageKey: "detail-panel-width",
    defaultWidth: 420,
    minWidth: 320,
    maxWidth: 720,
    edge: "right",
  });

  const label = panelAriaLabel(panel);
  const mentionSurface =
    panel.type === "skill" || panel.type === "ref"
      ? MENTION_PANEL_SURFACE
      : "bg-background";

  if (!isDesktop) {
    return (
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          className={cn(
            "w-[min(32rem,92vw)] gap-0 p-0 sm:max-w-lg",
            mentionSurface,
          )}
          side="right"
        >
          <SheetTitle className="sr-only">{label}</SheetTitle>
          <SheetDescription className="sr-only">
            Details alongside this conversation.
          </SheetDescription>
          <PanelBody onClose={onClose} panel={panel} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        "relative hidden shrink-0 flex-col border-l border-border/60 md:flex",
        mentionSurface,
      )}
      style={{ width }}
    >
      <div
        aria-label={`Resize ${label.toLowerCase()} panel`}
        aria-orientation="vertical"
        aria-valuemax={maxWidth}
        aria-valuemin={minWidth}
        aria-valuenow={width}
        className="absolute top-0 left-0 z-10 h-full w-1 -translate-x-1/2 cursor-col-resize touch-none hover:bg-border/60 active:bg-border"
        onKeyDown={onKeyDown}
        onMouseDown={startResize}
        role="separator"
        tabIndex={0}
      />

      <PanelBody onClose={onClose} panel={panel} />
    </aside>
  );
}

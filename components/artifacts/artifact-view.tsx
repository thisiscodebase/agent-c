"use client";

import {
  ArrowUpRightIcon,
  CheckIcon,
  EyeIcon,
  GlobeIcon,
  LinkIcon,
  LockIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  ARTIFACT_STATUSES,
  ARTIFACT_STATUS_HINTS,
  ARTIFACT_STATUS_LABELS,
  ARTIFACT_TYPE_LABELS,
  type Artifact,
  type ArtifactStatus,
} from "#shared/types/artifact";
import { ArtifactBody } from "~/components/artifacts/artifact-body";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useArtifact, useUpdateArtifactStatus } from "~/hooks/use-artifact";
import { useRecordArtifactOpen } from "~/hooks/use-artifact-recents";
import { formatFileDate } from "~/lib/file-system";
import { cn } from "~/lib/utils";

function CopyLinkButton({ artifactId }: { artifactId: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = new URL(`/artifacts/${artifactId}`, window.location.origin).href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      aria-label="Copy link"
      className="pointer-events-auto text-muted-foreground"
      onClick={() => void copy()}
      size="icon-sm"
      variant="ghost"
    >
      {copied ? <CheckIcon /> : <LinkIcon />}
    </Button>
  );
}

function VisibilityIcon({ status }: { status: ArtifactStatus }) {
  switch (status) {
    case "draft":
      return <LockIcon />;
    case "review":
      return <EyeIcon />;
    case "published":
      return <GlobeIcon />;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function VisibilityMenu({
  artifactId,
  status,
}: {
  artifactId: string;
  status: ArtifactStatus;
}) {
  const updateStatus = useUpdateArtifactStatus(artifactId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Visibility: ${ARTIFACT_STATUS_LABELS[status]}`}
            className="pointer-events-auto text-muted-foreground"
            disabled={updateStatus.isPending}
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <VisibilityIcon status={status} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52" sideOffset={6}>
        <DropdownMenuRadioGroup
          onValueChange={(value) => {
            if (value === status) return;
            updateStatus.mutate(value as ArtifactStatus);
          }}
          value={status}
        >
          <DropdownMenuLabel>Visibility</DropdownMenuLabel>
          {ARTIFACT_STATUSES.map((option) => (
            <DropdownMenuRadioItem
              className="items-start py-1.5"
              key={option}
              value={option}
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span>{ARTIFACT_STATUS_LABELS[option]}</span>
                <span className="text-xs font-normal text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground/80">
                  {ARTIFACT_STATUS_HINTS[option]}
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The document is the page: no chrome, no inner scroller, just a masthead that
 * reads as the first thing written on the paper and a body that runs off the
 * bottom of the screen.
 */
export function ArtifactView({
  artifact: initialArtifact,
  onClose,
  showFullPageLink = false,
  className,
}: {
  artifact: Artifact;
  onClose?: () => void;
  showFullPageLink?: boolean;
  className?: string;
}) {
  const { artifact: liveArtifact } = useArtifact(initialArtifact.id, initialArtifact);
  const artifact = liveArtifact ?? initialArtifact;
  const showTrailingActions = showFullPageLink || Boolean(onClose);
  useRecordArtifactOpen(artifact.id);

  return (
    <article
      className={cn("h-full overflow-y-auto", className)}
      data-paper={artifact.colour}
    >
      <div className="pointer-events-none sticky top-0 z-10 flex items-start justify-between gap-0.5 p-2">
        <div className="pointer-events-auto flex gap-0.5 rounded-lg bg-background/70 backdrop-blur-sm">
          <VisibilityMenu artifactId={artifact.id} status={artifact.status} />
          <CopyLinkButton artifactId={artifact.id} />
        </div>

        {showTrailingActions ? (
          <div className="pointer-events-auto flex gap-0.5 rounded-lg bg-background/70 backdrop-blur-sm">
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
        ) : null}
      </div>

      <div className="mx-auto w-full max-w-2xl px-6 pt-4 pb-24 text-sm sm:px-10">
        <p className="text-xs text-muted-foreground">
          {ARTIFACT_TYPE_LABELS[artifact.type]} by {artifact.authorName},{" "}
          {artifact.status === "published" ? "published" : "last updated"}{" "}
          {formatFileDate(artifact.updatedAt)}
        </p>

        <h1 className="mt-3 mb-8 font-artifact-title text-4xl leading-[1.1] font-normal tracking-tight text-balance italic sm:text-5xl">
          {artifact.title}
        </h1>

        <ArtifactBody
          contentMarkdown={artifact.contentMarkdown}
          title={artifact.title}
        />
      </div>
    </article>
  );
}

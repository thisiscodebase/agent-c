"use client";

import { FolderIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { ArtifactSummary } from "#shared/types/artifact";
import { DocumentThumbnail } from "~/components/artifacts/document-thumbnail";
import { cn } from "~/lib/utils";

function Rail({
  title,
  children,
  empty,
  className,
}: {
  title: string;
  children?: ReactNode;
  empty?: ReactNode;
  className?: string;
}) {
  const hasItems = Boolean(children);

  return (
    <section className={cn("flex flex-col gap-2", className)}>
      <h2 className="px-3 text-sm font-medium text-foreground">{title}</h2>
      {hasItems ? (
        <div className="flex gap-1 overflow-x-auto px-2 pb-1 [scrollbar-width:thin]">
          {children}
        </div>
      ) : (
        <p className="px-3 pb-1 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

export function ArtifactDocTile({
  artifact,
  onOpen,
}: {
  artifact: ArtifactSummary;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      className="group flex w-[6.5rem] shrink-0 cursor-pointer flex-col items-center gap-2 rounded-lg p-2 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      onClick={() => onOpen(artifact.id)}
      title={artifact.title}
      type="button"
    >
      <div className="h-28 w-[5.5rem] overflow-hidden rounded-sm border border-border/70 shadow-sm group-hover:ring-2 group-hover:ring-orange-500/40">
        <DocumentThumbnail
          colour={artifact.colour}
          leadingVisual={artifact.leadingVisual}
          title={artifact.title}
        />
      </div>
      <span className="w-full break-words text-xs">{artifact.title}</span>
    </button>
  );
}

export function ArtifactFolderTile({
  name,
  fileCount,
  onOpen,
}: {
  name: string;
  fileCount: number;
  onOpen: () => void;
}) {
  return (
    <button
      className="group flex w-[6.5rem] shrink-0 cursor-pointer flex-col items-center gap-2 rounded-lg p-2 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      onClick={onOpen}
      title={name}
      type="button"
    >
      <FolderIcon className="size-20 fill-orange-300/70 stroke-orange-500/70 dark:fill-orange-400/25 dark:stroke-orange-300/60" />
      <span className="w-full break-words text-xs">{name}</span>
      <span className="-mt-1.5 text-[0.6875rem] text-muted-foreground">
        {fileCount === 1 ? "1 item" : `${fileCount} items`}
      </span>
    </button>
  );
}

export function ArtifactDocRail({
  title,
  artifacts,
  empty,
  onOpen,
}: {
  title: string;
  artifacts: ArtifactSummary[];
  empty?: ReactNode;
  onOpen: (id: string) => void;
}) {
  return (
    <Rail
      empty={empty}
      title={title}
    >
      {artifacts.length > 0
        ? artifacts.map((artifact) => (
          <ArtifactDocTile
            artifact={artifact}
            key={artifact.id}
            onOpen={onOpen}
          />
        ))
        : undefined}
    </Rail>
  );
}

export function ArtifactBrowseRail({
  title,
  folders,
  onOpenFolder,
}: {
  title: string;
  folders: { name: string; path: string; fileCount: number }[];
  onOpenFolder: (path: string) => void;
}) {
  return (
    <Rail empty="No folders yet." title={title}>
      {folders.length > 0
        ? folders.map((folder) => (
          <ArtifactFolderTile
            fileCount={folder.fileCount}
            key={folder.path}
            name={folder.name}
            onOpen={() => onOpenFolder(folder.path)}
          />
        ))
        : undefined}
    </Rail>
  );
}

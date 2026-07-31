"use client";

import { FilesIcon } from "lucide-react";
import Link from "next/link";
import { useArtifactList } from "~/hooks/use-artifact";

/** Sidebar entry point into the document library at /artifacts. */
export function DocsTile({ active }: { active: boolean }) {
  const { artifacts } = useArtifactList();

  return (
    <div className="px-3 pb-1">
      <Link
        className="flex min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-2.5 py-2 text-sm hover:bg-orange-500/8 data-[active=true]:border-orange-500/30 data-[active=true]:bg-orange-500/15 data-[active=true]:font-medium data-[active=true]:text-orange-950 dark:hover:bg-orange-500/12 dark:data-[active=true]:bg-orange-500/22 dark:data-[active=true]:text-orange-50"
        data-active={active}
        href="/artifacts"
      >
        <FilesIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate">Docs</span>
        {artifacts.length > 0 ? (
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {artifacts.length}
          </span>
        ) : null}
      </Link>
    </div>
  );
}

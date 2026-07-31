"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { ArtifactColour, ArtifactSummary } from "#shared/types/artifact";
import { FileBrowser } from "~/components/file-browser/file-browser";
import { toArtifactColour } from "~/lib/artifact-display";
import { buildArtifactManifest } from "~/lib/artifact-manifest";
import type { FileSystemFileItem } from "~/lib/file-system";

/** A page of the document's own paper stock, with its text suggested in ink. */
function PaperThumbnail({ colour }: { colour: ArtifactColour }) {
  return (
    <div className="flex size-full flex-col gap-[3px] p-1.5" data-paper={colour}>
      <span className="h-[3px] w-3/4 rounded-full bg-foreground/70" />
      <span className="mt-0.5 h-[2px] w-full rounded-full bg-foreground/25" />
      <span className="h-[2px] w-full rounded-full bg-foreground/25" />
      <span className="h-[2px] w-4/5 rounded-full bg-foreground/25" />
      <span className="mt-1 h-[2px] w-full rounded-full bg-foreground/25" />
      <span className="h-[2px] w-2/3 rounded-full bg-foreground/25" />
    </div>
  );
}

export function ArtifactBrowser({ artifacts }: { artifacts: ArtifactSummary[] }) {
  const router = useRouter();
  const items = useMemo(() => buildArtifactManifest(artifacts), [artifacts]);

  return (
    <FileBrowser
      emptyState="No documents here yet. Ask for a case study or report in chat."
      items={items}
      onFileOpen={(file: FileSystemFileItem) => {
        if (file.key) {
          router.push(`/artifacts/${file.key}`);
        }
      }}
      renderFilePreview={(file) => (
        <PaperThumbnail colour={toArtifactColour(file.metadata?.colour)} />
      )}
      title="Docs"
    />
  );
}

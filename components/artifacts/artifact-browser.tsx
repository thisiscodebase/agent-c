"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { ArtifactSummary } from "#shared/types/artifact";
import {
  ArtifactBrowseRail,
  ArtifactDocRail,
} from "~/components/artifacts/artifact-doc-rail";
import { DocumentThumbnail } from "~/components/artifacts/document-thumbnail";
import { FileBrowser } from "~/components/file-browser/file-browser";
import { useRecentArtifactIds } from "~/hooks/use-artifact-recents";
import { toArtifactColour } from "~/lib/artifact-display";
import { buildArtifactManifest } from "~/lib/artifact-manifest";
import {
  countFilesUnder,
  folderContents,
  type FileSystemFileItem,
} from "~/lib/file-system";

const MY_DOCS_LIMIT = 16;

function DocsHome({
  artifacts,
  goTo,
  onOpenDoc,
}: {
  artifacts: ArtifactSummary[];
  goTo: (path: string) => void;
  onOpenDoc: (id: string) => void;
}) {
  const recentIds = useRecentArtifactIds();
  const byId = useMemo(
    () => new Map(artifacts.map((artifact) => [artifact.id, artifact])),
    [artifacts],
  );

  const recent = useMemo(
    () => recentIds
      .map((id) => byId.get(id))
      .filter((artifact): artifact is ArtifactSummary => Boolean(artifact)),
    [byId, recentIds],
  );

  const myDocs = useMemo(
    () => [...artifacts]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MY_DOCS_LIMIT),
    [artifacts],
  );

  const browseFolders = useMemo(() => {
    const items = buildArtifactManifest(artifacts);
    return folderContents(items, "").folders.map((folder) => ({
      name: folder.name ?? folder.path.replace(/\/$/, ""),
      path: folder.path,
      fileCount: countFilesUnder(items, folder.path),
    }));
  }, [artifacts]);

  return (
    <div className="flex flex-col gap-6 py-4">
      <ArtifactDocRail
        artifacts={recent}
        empty="Open a document to see it here."
        onOpen={onOpenDoc}
        title="Recent docs"
      />
      <ArtifactDocRail
        artifacts={myDocs}
        empty="No documents here yet. Ask for a case study or report in chat."
        onOpen={onOpenDoc}
        title="My docs"
      />
      <ArtifactBrowseRail
        folders={browseFolders}
        onOpenFolder={goTo}
        title="Browse"
      />
    </div>
  );
}

export function ArtifactBrowser({ artifacts }: { artifacts: ArtifactSummary[] }) {
  const router = useRouter();
  const items = useMemo(() => buildArtifactManifest(artifacts), [artifacts]);
  const byId = useMemo(
    () => new Map(artifacts.map((artifact) => [artifact.id, artifact])),
    [artifacts],
  );

  function openDoc(id: string) {
    router.push(`/artifacts/${id}`);
  }

  return (
    <FileBrowser
      emptyState="No documents here yet. Ask for a case study or report in chat."
      items={items}
      onFileOpen={(file: FileSystemFileItem) => {
        if (file.key) {
          openDoc(file.key);
        }
      }}
      renderFilePreview={(file) => {
        const artifact = file.key ? byId.get(file.key) : undefined;
        return (
          <DocumentThumbnail
            colour={toArtifactColour(file.metadata?.colour)}
            leadingVisual={artifact?.leadingVisual}
            title={file.metadata?.title || file.name || "Untitled"}
          />
        );
      }}
      renderHome={({ goTo }) => (
        <DocsHome artifacts={artifacts} goTo={goTo} onOpenDoc={openDoc} />
      )}
      title="Docs"
    />
  );
}

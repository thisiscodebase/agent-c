import type { ArtifactSummary, ArtifactType } from "#shared/types/artifact";
import type { FileSystemFileItem, FileSystemItem } from "~/lib/file-system";

/** Artifacts are filed by type, which is the only hierarchy they have today. */
const TYPE_FOLDERS: Record<ArtifactType, string> = {
  case_study: "Case studies",
  report: "Reports",
  summary: "Summaries",
  note: "Notes",
};

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return slug || "untitled";
}

/** The artifact this manifest entry stands for, or undefined for stray files. */
export function artifactIdForFile(file: FileSystemFileItem): string | undefined {
  return file.key;
}

export function buildArtifactManifest(artifacts: ArtifactSummary[]): FileSystemItem[] {
  const usedPaths = new Set<string>();

  const files = artifacts.map((artifact): FileSystemFileItem => {
    const folder = TYPE_FOLDERS[artifact.type];
    const base = `${folder}/${slugify(artifact.title)}`;

    let path = `${base}.md`;
    for (let suffix = 2; usedPaths.has(path); suffix += 1) {
      path = `${base}-${suffix}.md`;
    }
    usedPaths.add(path);

    return {
      kind: "file",
      key: artifact.id,
      path,
      // The slug keeps the path tidy; the browser shows the real title.
      name: `${artifact.title}.md`,
      contentType: "text/markdown",
      size: artifact.size,
      createdAt: new Date(artifact.createdAt).toISOString(),
      updatedAt: new Date(artifact.updatedAt).toISOString(),
      metadata: {
        title: artifact.title,
        type: artifact.type,
        status: artifact.status,
        colour: artifact.colour,
      },
    };
  });

  // Explicit folders keep every type visible, including the empty ones — the
  // library reads as a filing cabinet rather than only the drawers in use.
  const folders = Object.values(TYPE_FOLDERS).map((name): FileSystemItem => ({
    kind: "folder",
    path: `${name}/`,
    name,
  }));

  return [...folders, ...files];
}

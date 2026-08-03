"use client";

import { DetailSidePanel } from "~/components/detail-panel/detail-side-panel";

/**
 * @deprecated Prefer `DetailSidePanel` with `{ type: "artifact", id }`.
 */
export function ArtifactSidePanel({
  artifactId,
  onClose,
}: {
  artifactId: string;
  onClose: () => void;
}) {
  return (
    <DetailSidePanel
      onClose={onClose}
      panel={{ type: "artifact", id: artifactId }}
    />
  );
}

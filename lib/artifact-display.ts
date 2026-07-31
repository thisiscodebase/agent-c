import {
  BookOpenIcon,
  FileTextIcon,
  ListIcon,
  StickyNoteIcon,
  type LucideIcon,
} from "lucide-react";
import type { ArtifactColour, ArtifactStatus, ArtifactType } from "#shared/types/artifact";
import { ARTIFACT_COLOURS } from "#shared/types/artifact";

export const ARTIFACT_TYPE_ICONS: Record<ArtifactType, LucideIcon> = {
  case_study: BookOpenIcon,
  report: FileTextIcon,
  summary: ListIcon,
  note: StickyNoteIcon,
};

export const ARTIFACT_STATUS_VARIANTS: Record<
  ArtifactStatus,
  "secondary" | "outline" | "default"
> = {
  draft: "secondary",
  review: "outline",
  published: "default",
};

/**
 * Paper stocks arrive as loose strings from file-manifest metadata, so fall
 * back to plain white rather than rendering an untinted, half-styled page.
 */
export function toArtifactColour(value: string | undefined): ArtifactColour {
  return ARTIFACT_COLOURS.includes(value as ArtifactColour)
    ? value as ArtifactColour
    : "white";
}

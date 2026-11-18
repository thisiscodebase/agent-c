"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangleIcon } from "lucide-react";
import { useEffect } from "react";
import type { EveToolPart } from "eve/react";
import {
  ARTIFACT_TYPES,
  extractArtifactSummaryLine,
  stripLeadingTitleHeading,
  type ArtifactColour,
  type ArtifactStatus,
  type ArtifactType,
} from "#shared/types/artifact";
import { extractLeadingArtifactVisual } from "#shared/types/artifact-chart";
import { ArtifactCoverCard } from "~/components/artifacts/artifact-cover-card";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useArtifact } from "~/hooks/use-artifact";
import { useArtifactPanel } from "~/hooks/use-artifact-panel";
import { toArtifactColour } from "~/lib/artifact-display";
import { queryKeys } from "~/lib/query-keys";

interface CreateArtifactOutput {
  id: string;
  type: ArtifactType;
  title: string;
  status: ArtifactStatus;
  colour: ArtifactColour;
  preview: string;
}

function isArtifactType(value: unknown): value is ArtifactType {
  return ARTIFACT_TYPES.includes(value as ArtifactType);
}

function asArtifactOutput(output: unknown): CreateArtifactOutput | undefined {
  if (!output || typeof output !== "object") return undefined;
  const candidate = output as Partial<CreateArtifactOutput>;
  if (typeof candidate.id !== "string" || typeof candidate.title !== "string") return undefined;
  if (!isArtifactType(candidate.type)) return undefined;

  return {
    id: candidate.id,
    type: candidate.type,
    title: candidate.title,
    status: candidate.status ?? "draft",
    colour: toArtifactColour(candidate.colour),
    preview: candidate.preview ?? "",
  };
}

function pendingTitle(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const title = (input as { title?: unknown }).title;
  return typeof title === "string" && title.trim() ? title.trim() : undefined;
}

function contentMarkdownFromInput(input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const content = (input as { contentMarkdown?: unknown }).contentMarkdown;
  return typeof content === "string" ? content : "";
}

export function ArtifactPart({
  part,
}: {
  part: EveToolPart;
}) {
  const { openArtifact } = useArtifactPanel();
  const queryClient = useQueryClient();
  const artifact = part.state === "streaming" ? undefined : asArtifactOutput(part.output);
  const savedArtifactId = artifact?.id;
  const { artifact: liveArtifact } = useArtifact(savedArtifactId);

  useEffect(() => {
    if (!savedArtifactId) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.artifacts });
  }, [queryClient, savedArtifactId]);

  if (part.state === "failed") {
    return (
      <Card className="not-prose mb-4" size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangleIcon className="size-4 text-destructive" />
            Could not save artifact
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {part.error?.message ?? "The document was not saved."}
        </CardContent>
      </Card>
    );
  }

  const rawInput = part.state === "streaming" ? undefined : part.input;
  const inputTitle = pendingTitle(rawInput);
  const inputBody = contentMarkdownFromInput(rawInput);
  const body = liveArtifact?.contentMarkdown || inputBody || artifact?.preview || "";
  const title = artifact?.title ?? inputTitle;
  const summaryLine = title
    ? extractArtifactSummaryLine(body, title)
    : undefined;
  const stripped = title ? stripLeadingTitleHeading(body, title) : body;
  const leadingVisual = liveArtifact?.leadingVisual
    ?? extractLeadingArtifactVisual(stripped);

  return (
    <ArtifactCoverCard
      colour={artifact?.colour}
      leadingVisual={artifact ? leadingVisual : undefined}
      onOpen={artifact ? () => openArtifact(artifact.id) : undefined}
      pending={!artifact}
      summaryLine={summaryLine}
      title={title}
    />
  );
}

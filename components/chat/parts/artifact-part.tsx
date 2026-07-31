"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangleIcon, ArrowUpRightIcon } from "lucide-react";
import { useEffect } from "react";
import type { EveMessagePart } from "eve/react";
import {
  ARTIFACT_STATUS_LABELS,
  ARTIFACT_TYPE_LABELS,
  ARTIFACT_TYPES,
  type ArtifactColour,
  type ArtifactStatus,
  type ArtifactType,
} from "#shared/types/artifact";
import { ArtifactMarkdown } from "~/components/artifacts/artifact-markdown";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import {
  ARTIFACT_STATUS_VARIANTS,
  ARTIFACT_TYPE_ICONS,
  toArtifactColour,
} from "~/lib/artifact-display";
import { queryKeys } from "~/lib/query-keys";
import { useArtifactPanel } from "~/hooks/use-artifact-panel";

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

/** Title from the streaming tool input, before the artifact has been saved. */
function pendingTitle(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const title = (input as { title?: unknown }).title;
  return typeof title === "string" && title.trim() ? title.trim() : undefined;
}

export function ArtifactPart({
  part,
}: {
  part: Extract<EveMessagePart, { type: "dynamic-tool" }>;
}) {
  const { openArtifact } = useArtifactPanel();
  const queryClient = useQueryClient();
  const artifact = "output" in part ? asArtifactOutput(part.output) : undefined;
  const savedArtifactId = artifact?.id;

  // The agent writes artifacts server-side, so the sidebar list only learns
  // about a new one once the tool call resolves here.
  useEffect(() => {
    if (!savedArtifactId) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.artifacts });
  }, [queryClient, savedArtifactId]);

  if (part.state === "output-error") {
    return (
      <Card className="not-prose mb-4" size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangleIcon className="size-4 text-destructive" />
            Could not save artifact
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {part.errorText ?? "The document was not saved."}
        </CardContent>
      </Card>
    );
  }

  if (!artifact) {
    const title = pendingTitle(part.input);
    return (
      <Card className="not-prose mb-4" size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            {title ? `Writing “${title}”…` : "Writing document…"}
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const TypeIcon = ARTIFACT_TYPE_ICONS[artifact.type];

  return (
    <Card className="not-prose mb-4 bg-background" data-paper={artifact.colour}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TypeIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">{artifact.title}</span>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{ARTIFACT_TYPE_LABELS[artifact.type]}</Badge>
          <Badge variant={ARTIFACT_STATUS_VARIANTS[artifact.status]}>
            {ARTIFACT_STATUS_LABELS[artifact.status]}
          </Badge>
        </div>
      </CardHeader>

      {artifact.preview ? (
        <CardContent className="relative max-h-52 overflow-hidden text-sm">
          <ArtifactMarkdown>{artifact.preview}</ArtifactMarkdown>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent"
          />
        </CardContent>
      ) : null}

      <CardFooter>
        <Button onClick={() => openArtifact(artifact.id)} size="sm" variant="outline">
          Open
          <ArrowUpRightIcon />
        </Button>
      </CardFooter>
    </Card>
  );
}

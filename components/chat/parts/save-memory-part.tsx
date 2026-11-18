"use client";

import { BrainIcon, CheckIcon, XIcon } from "lucide-react";
import type { EveToolPart } from "eve/react";
import { MEMORY_CATEGORIES, MEMORY_CATEGORY_LABELS, type MemoryCategory } from "#shared/types/memory";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";

interface SaveMemoryInput {
  reason: string;
  updates: { category: MemoryCategory; content: string }[];
}

function isSaveMemoryInput(input: unknown): input is SaveMemoryInput {
  if (!input || typeof input !== "object") return false;
  const updates = (input as { updates?: unknown }).updates;
  return Array.isArray(updates) && updates.every(
    (u) => u && typeof u === "object" && MEMORY_CATEGORIES.includes((u as { category?: string }).category as MemoryCategory),
  );
}

export function SaveMemoryPart({
  part,
  onRespond,
}: {
  part: EveToolPart;
  onRespond: (interactionId: string, optionId: string) => void;
}) {
  const input = part.state === "streaming"
    ? undefined
    : isSaveMemoryInput(part.input) ? part.input : undefined;
  const interaction = part.interaction?.status === "open" ? part.interaction : undefined;
  const request = interaction?.request;

  return (
    <Card className="not-prose mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <BrainIcon className="size-4" />
          Save to memory
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {input?.reason ? <p className="text-muted-foreground">{input.reason}</p> : null}
        {(input?.updates ?? []).map((update) => (
          <div className="rounded-md border p-3" key={update.category}>
            <p className="font-medium">{MEMORY_CATEGORY_LABELS[update.category]}</p>
            <p className="whitespace-pre-wrap text-muted-foreground">{update.content}</p>
          </div>
        ))}
      </CardContent>
      {request ? (
        <CardFooter className="gap-2">
          {request.options?.map((option) => (
            <Button
              key={option.id}
              size="sm"
              variant={option.style === "danger" ? "destructive" : option.style === "primary" ? "default" : "outline"}
              onClick={() => onRespond(interaction.interactionId, option.id)}
            >
              {option.style === "danger" ? <XIcon /> : <CheckIcon />}
              {option.label}
            </Button>
          ))}
        </CardFooter>
      ) : (
        <CardFooter>
          <p className="text-xs text-muted-foreground">{part.state === "rejected" ? "Declined" : "Saved"}</p>
        </CardFooter>
      )}
    </Card>
  );
}

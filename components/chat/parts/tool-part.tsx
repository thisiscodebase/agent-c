"use client";

import type { EveToolPart } from "eve/react";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "~/components/ai-elements/tool";
import { InputRequestCard } from "~/components/ui/input-request-card";
import {
  getInputRequestResponseLabel,
  isInputRequestPending,
} from "~/lib/input-request-display";
import { toolErrorText, toolInput, toolOutput, toolUiState } from "~/lib/eve-tool";
import { ArtifactPart } from "./artifact-part";
import { SaveMemoryPart } from "./save-memory-part";

function getInputRequestTitle(part: EveToolPart): string {
  const request = part.interaction?.request;
  if (part.name === "ask_question") return "Quick question";
  if (request?.display === "confirmation" || request?.kind === "approval") {
    return "Needs your approval";
  }
  return "Needs your input";
}

export function ToolPart({
  part,
  onRespond,
}: {
  part: EveToolPart;
  onRespond: (interactionId: string, optionId: string) => void;
}) {
  if (part.name === "save_memory") {
    return <SaveMemoryPart onRespond={onRespond} part={part} />;
  }

  if (part.name === "create_artifact") {
    return <ArtifactPart part={part} />;
  }

  const request = part.interaction?.request;
  const interaction = part.interaction;

  if (request && interaction) {
    const isPending = isInputRequestPending(part);
    const respondedWith = getInputRequestResponseLabel(part);

    return (
      <InputRequestCard
        allowFreeform={request.allowFreeform}
        description={request.prompt}
        iconCategory={request.kind === "approval" || request.display === "confirmation" ? "approval" : "question"}
        isDenied={part.state === "rejected" || interaction.outcome === "declined"}
        isPending={isPending}
        onSelect={(optionId) => onRespond(interaction.interactionId, optionId)}
        options={request.options}
        respondedWith={respondedWith}
        statusLabel={
          request.display === "confirmation" || request.kind === "approval"
            ? "Awaiting approval"
            : "Waiting for you"
        }
        title={getInputRequestTitle(part)}
      />
    );
  }

  const input = toolInput(part);
  const output = toolOutput(part);
  const errorText = toolErrorText(part);

  return (
    <Tool defaultOpen={part.state === "approval" || part.state === "failed"}>
      <ToolHeader state={toolUiState(part)} toolName={part.name} type="dynamic-tool" />
      <ToolContent>
        {input !== undefined ? <ToolInput input={input} /> : null}
        {output !== undefined || errorText ? (
          <ToolOutput errorText={errorText} output={output} />
        ) : null}
      </ToolContent>
    </Tool>
  );
}

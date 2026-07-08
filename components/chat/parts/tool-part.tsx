"use client";

import { useState } from "react";
import type { EveMessagePart } from "eve/react";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "~/components/ai-elements/tool";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { SaveMemoryPart } from "./save-memory-part";

type DynamicToolPartData = Extract<EveMessagePart, { type: "dynamic-tool" }>;

function InputRequestActions({
  part,
  onRespond,
}: {
  part: DynamicToolPartData;
  onRespond: (requestId: string, optionId: string) => void;
}) {
  const request = part.toolMetadata?.eve?.inputRequest;
  const [freeform, setFreeform] = useState("");

  if (!request) return null;

  return (
    <div className="flex flex-col gap-2 border-t p-4">
      <p className="text-sm">{request.prompt}</p>
      <div className="flex flex-wrap gap-2">
        {request.options?.map((option) => (
          <Button
            key={option.id}
            size="sm"
            variant={option.style === "danger" ? "destructive" : option.style === "primary" ? "default" : "outline"}
            onClick={() => onRespond(request.requestId, option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {request.allowFreeform ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (freeform.trim()) onRespond(request.requestId, freeform.trim());
          }}
        >
          <Input onChange={(e) => setFreeform(e.target.value)} placeholder="Type a response…" value={freeform} />
          <Button size="sm" type="submit" variant="outline">Send</Button>
        </form>
      ) : null}
    </div>
  );
}

export function ToolPart({
  part,
  onRespond,
}: {
  part: DynamicToolPartData;
  onRespond: (requestId: string, optionId: string) => void;
}) {
  if (part.toolName === "save_memory") {
    return <SaveMemoryPart onRespond={onRespond} part={part} />;
  }

  const request = part.toolMetadata?.eve?.inputRequest;

  return (
    <Tool defaultOpen={part.state === "approval-requested" || part.state === "output-error"}>
      <ToolHeader state={part.state} toolName={part.toolName} type="dynamic-tool" />
      <ToolContent>
        {"input" in part && part.input !== undefined ? <ToolInput input={part.input} /> : null}
        {"output" in part || "errorText" in part ? (
          <ToolOutput errorText={part.errorText} output={part.output} />
        ) : null}
      </ToolContent>
      {request ? <InputRequestActions onRespond={onRespond} part={part} /> : null}
    </Tool>
  );
}

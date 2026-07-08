"use client";

import type { EveMessagePart } from "eve/react";
import { Conversation, ConversationContent, ConversationEmptyState } from "~/components/ai-elements/conversation";
import { Message, MessageContent } from "~/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "~/components/ai-elements/prompt-input";
import { Button } from "~/components/ui/button";
import type { ThreadRecord } from "#shared/types/thread";
import { useChatSession } from "~/hooks/chat/use-chat-session";

function AuthorizationPart({ part }: { part: Extract<EveMessagePart, { type: "authorization" }> }) {
  if (part.state === "completed") {
    return (
      <p className="text-sm text-muted-foreground">
        {part.outcome === "authorized"
          ? `${part.displayName} connected.`
          : `${part.displayName} authorization ${part.outcome}.`}
      </p>
    );
  }

  return (
    <div className="rounded-md border p-3 text-sm">
      <p>{part.description}</p>
      {part.authorization?.userCode ? <code className="mt-1 block">{part.authorization.userCode}</code> : null}
      {part.authorization?.url ? (
        <a className="mt-1 block underline" href={part.authorization.url} rel="noreferrer" target="_blank">
          Sign in
        </a>
      ) : null}
    </div>
  );
}

function DynamicToolPart({
  part,
  onRespond,
}: {
  part: Extract<EveMessagePart, { type: "dynamic-tool" }>;
  onRespond: (requestId: string, optionId: string) => void;
}) {
  const request = part.toolMetadata?.eve?.inputRequest;

  return (
    <div className="rounded-md border p-3 text-sm">
      <p className="font-medium">{part.toolName}</p>
      {request ? (
        <div className="mt-2 flex flex-col gap-2">
          <p>{request.prompt}</p>
          <div className="flex gap-2">
            {(request.options ?? []).map((option) => (
              <Button key={option.id} size="sm" variant="outline" onClick={() => onRespond(request.requestId, option.id)}>
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground">{part.state}</p>
      )}
    </div>
  );
}

export function ChatPageClient({ chatId, initialThread }: { chatId: string; initialThread: ThreadRecord }) {
  const { agent, isBusy } = useChatSession(chatId, initialThread);

  function respondToInput(requestId: string, optionId: string) {
    void agent.send({ inputResponses: [{ requestId, optionId }] });
  }

  return (
    <div className="flex h-full flex-col">
      <Conversation>
        <ConversationContent>
          {agent.data.messages.length === 0 ? (
            <ConversationEmptyState description="Send a message to get started" title="No messages yet" />
          ) : (
            agent.data.messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return <p key={index}>{part.text}</p>;
                    }
                    if (part.type === "authorization") {
                      return <AuthorizationPart key={index} part={part} />;
                    }
                    if (part.type === "dynamic-tool") {
                      return <DynamicToolPart key={index} part={part} onRespond={respondToInput} />;
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
      </Conversation>

      <div className="border-t p-4">
        <PromptInput
          onSubmit={(message) => {
            if (message.text.trim()) void agent.send({ message: message.text });
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea disabled={isBusy} />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit status={agent.status} onStop={agent.stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

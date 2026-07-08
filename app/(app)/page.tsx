"use client";

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "~/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "~/components/ai-elements/suggestion";
import { useChatNavigation } from "~/hooks/chat/use-chat-navigation";

const STARTERS = [
  "Summarize the latest updates in Drive",
  "What's the status of the Acme account in HubSpot?",
  "Draft a case study from this week's Slack threads",
];

export default function HomePage() {
  const { startNewChat } = useChatNavigation();

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">CodeBase Agent</h1>
        <p className="text-sm text-muted-foreground">
          Ask about anything across Drive, HubSpot, and Slack.
        </p>
      </div>

      <PromptInput
        className="w-full"
        onSubmit={(message) => {
          if (message.text.trim()) void startNewChat(message.text);
        }}
      >
        <PromptInputBody>
          <PromptInputTextarea />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools />
          <PromptInputSubmit />
        </PromptInputFooter>
      </PromptInput>

      <Suggestions>
        {STARTERS.map((text) => (
          <Suggestion key={text} suggestion={text} onClick={startNewChat} />
        ))}
      </Suggestions>
    </div>
  );
}

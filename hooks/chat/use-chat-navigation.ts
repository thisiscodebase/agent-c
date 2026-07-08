"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ThreadRecord, ThreadSummary } from "#shared/types/thread";
import { truncateThreadTitle } from "#shared/types/thread";
import { queryKeys } from "~/lib/query-keys";
import { setPendingMessage } from "./use-pending-message";

interface ThreadListResponse {
  threads: ThreadSummary[];
}

export function useChatNavigation() {
  const router = useRouter();
  const queryClient = useQueryClient();

  function navigate(to: string) {
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      document.startViewTransition(() => router.push(to));
    }
    else {
      router.push(to);
    }
  }

  async function startNewChat(message: string) {
    const text = message.trim();
    if (!text) return;

    const chatId = crypto.randomUUID();

    const { thread } = await fetch("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: chatId, title: truncateThreadTitle(text) }),
    }).then((r) => r.json() as Promise<{ thread: ThreadRecord }>);

    queryClient.setQueryData<ThreadListResponse>(queryKeys.threads, (old) => ({
      threads: [thread, ...(old?.threads ?? []).filter((entry) => entry.id !== thread.id)],
    }));
    setPendingMessage(chatId, text);
    await queryClient.invalidateQueries({ queryKey: queryKeys.threads });
    navigate(`/chat/${chatId}`);
  }

  async function deleteThread(id: string, currentChatId?: string) {
    await fetch(`/api/threads/${id}`, { method: "DELETE" });
    await queryClient.invalidateQueries({ queryKey: queryKeys.threads });
    if (currentChatId === id) {
      navigate("/");
    }
  }

  return { startNewChat, deleteThread, navigate };
}

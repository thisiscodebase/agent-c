import type { MaybeRefOrGetter } from "vue";
import { nextTick, toValue } from "vue";
import { resetAllEveAgents, removeEveAgent } from "~/composables/chat/providers/eve/init";
import { resetStreamLog } from "~/composables/chat/providers/eve/stream-log";
import { truncateThreadTitle } from "#shared/types/thread";

type PendingMessage = {
  chatId: string;
  text: string;
};

let pendingMessage: PendingMessage | null = null;

const CHAT_PATH = /^\/chat\/[^/]+$/;

function isHomeChatTransition(from: string, to: string) {
  return (from === "/" && CHAT_PATH.test(to)) || (CHAT_PATH.test(from) && to === "/");
}

async function navigateWithChatPromptTransition(to: string) {
  if (!import.meta.client || !document.startViewTransition) {
    return navigateTo(to);
  }

  const route = useRoute();
  if (!isHomeChatTransition(route.path, to)) {
    return navigateTo(to);
  }

  const transition = document.startViewTransition(async () => {
    await navigateTo(to);
    await nextTick();
  });

  await transition.finished;
}

export const THREAD_LIST_KEY = "thread-list";

export async function refreshThreadList() {
  await refreshNuxtData(THREAD_LIST_KEY);
}

export async function startChat(message: string, chatId = crypto.randomUUID()) {
  const text = message.trim();
  if (!text) return;

  await $fetch("/api/threads", {
    method: "POST",
    body: {
      id: chatId,
      title: truncateThreadTitle(text),
    },
  });

  pendingMessage = { chatId, text };
  await refreshThreadList();
  await navigateWithChatPromptTransition(`/chat/${chatId}`);
}

export function consumePendingMessage(chatId: string) {
  if (pendingMessage?.chatId !== chatId) return null;

  const text = pendingMessage.text;
  pendingMessage = null;
  return text;
}

export async function startNewChat() {
  pendingMessage = null;
  resetStreamLog();
  resetAllEveAgents();
  await navigateWithChatPromptTransition("/");
}

export function useChatNavigation(chatId: MaybeRefOrGetter<string>) {
  function consumePendingOnMount(sendMessage: (text: string) => Promise<void>) {
    const id = toValue(chatId);
    const pending = consumePendingMessage(id);
    if (pending) {
      void sendMessage(pending);
      return true;
    }
    return false;
  }

  return {
    consumePendingOnMount,
  };
}

export async function deleteThread(id: string) {
  await $fetch(`/api/threads/${id}`, { method: "DELETE" });
  removeEveAgent(id);
  await refreshThreadList();

  const route = useRoute();
  if (route.params.id === id) {
    await startNewChat();
  }
}

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireSessionUser } from "~~/server/utils/session";
import { getThreadForViewer } from "~~/server/utils/threads";
import { ChatPageClient } from "~/components/chat/chat-page-client";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { userId, email }] = await Promise.all([
    params,
    requireSessionUser(await headers()),
  ]);

  const resolved = await getThreadForViewer(userId, email, id);
  if (!resolved) {
    notFound();
  }

  return (
    <ChatPageClient
      key={id}
      access={resolved.access}
      chatId={id}
      initialThread={resolved.thread}
    />
  );
}

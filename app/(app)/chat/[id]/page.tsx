import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireSessionUserId } from "~~/server/utils/session";
import { getThreadForUser } from "~~/server/utils/threads";
import { ChatPageClient } from "~/components/chat/chat-page-client";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, userId] = await Promise.all([
    params,
    requireSessionUserId(await headers()),
  ]);

  const thread = await getThreadForUser(userId, id);
  if (!thread) {
    notFound();
  }

  return <ChatPageClient key={id} chatId={id} initialThread={thread} />;
}

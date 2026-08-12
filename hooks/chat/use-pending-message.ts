let pendingMessage: { chatId: string; text: string } | null = null;

export function setPendingMessage(chatId: string, text: string) {
  pendingMessage = { chatId, text };
}

/** Read the in-flight first message without consuming it (for first paint). */
export function peekPendingMessage(chatId: string): string | null {
  if (pendingMessage?.chatId !== chatId) return null;
  return pendingMessage.text;
}

export function consumePendingMessage(chatId: string): string | null {
  if (pendingMessage?.chatId !== chatId) return null;
  const text = pendingMessage.text;
  pendingMessage = null;
  return text;
}

export function clearPendingMessage() {
  pendingMessage = null;
}

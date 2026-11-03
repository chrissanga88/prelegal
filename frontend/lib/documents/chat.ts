import { ApiError, apiRequest } from "@/lib/api";
import type { DocumentDraft } from "./types";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatTurnResult = { reply: string; draft: DocumentDraft };

/** Matches the backend's per-message limit. */
export const MAX_MESSAGE_LENGTH = 4000;

/**
 * The backend accepts at most 60 messages per request. Long conversations send
 * only the most recent ones; the window is odd-sized so that, ending on the
 * user's message, it always starts with a user message too. Nothing is lost
 * from the document, since the current draft is sent on every turn.
 */
const MAX_HISTORY_MESSAGES = 59;

/**
 * Sends the conversation (ending with the user's latest message) and the
 * current draft to the AI, and returns its reply with the updated draft.
 * Throws an ApiError whose message is safe to show to the user.
 */
export async function sendChatTurn(
  messages: ChatMessage[],
  draft: DocumentDraft,
): Promise<ChatTurnResult> {
  const body = await apiRequest<Partial<ChatTurnResult>>("/api/chat", {
    method: "POST",
    body: { messages: messages.slice(-MAX_HISTORY_MESSAGES), draft },
  });
  if (typeof body.reply !== "string" || typeof body.draft !== "object" || !body.draft) {
    throw new ApiError(200, "Something went wrong. Please try again.");
  }
  return body as ChatTurnResult;
}

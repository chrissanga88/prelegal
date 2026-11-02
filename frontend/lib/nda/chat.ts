import type { NdaData } from "./types";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatTurnResult = { reply: string; fields: NdaData };

/** Matches the backend's per-message limit. */
export const MAX_MESSAGE_LENGTH = 4000;

/**
 * The backend accepts at most 60 messages per request. Long conversations send
 * only the most recent ones; the window is odd-sized so that, ending on the
 * user's message, it always starts with a user message too. Nothing is lost
 * from the document, since the current fields are sent on every turn.
 */
const MAX_HISTORY_MESSAGES = 59;

const GENERIC_ERROR = "Something went wrong. Please try again.";

/**
 * Sends the conversation (ending with the user's latest message) and the
 * current fields to the AI, and returns its reply with the updated fields.
 * Throws an Error whose message is safe to show to the user.
 */
export async function sendChatTurn(
  messages: ChatMessage[],
  fields: NdaData,
): Promise<ChatTurnResult> {
  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages.slice(-MAX_HISTORY_MESSAGES), fields }),
    });
  } catch {
    throw new Error("Couldn’t reach the server. Check your connection and try again.");
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    // FastAPI errors carry a user-facing string in `detail` (validation errors carry a list).
    const detail = body?.detail;
    throw new Error(typeof detail === "string" ? detail : GENERIC_ERROR);
  }
  if (typeof body?.reply !== "string" || typeof body?.fields !== "object") {
    throw new Error(GENERIC_ERROR);
  }
  return body as ChatTurnResult;
}

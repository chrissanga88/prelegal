"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { MAX_MESSAGE_LENGTH, sendChatTurn, type ChatMessage } from "@/lib/documents/chat";
import type { DocumentDraft } from "@/lib/documents/types";
import { inputClass } from "@/components/ui/styles";

/**
 * Shown first in the chat. It is not sent to the API, which requires the
 * conversation to start with a user message; the system prompt tells the model
 * it has already greeted the user.
 */
export const GREETING =
  "Hi! I’ll help you draft a legal agreement, such as an NDA, a cloud service agreement or a data processing agreement. What would you like to create, and who is it with?";

type Props = {
  draft: DocumentDraft;
  onChange: (draft: DocumentDraft) => void;
};

function Bubble({ message }: { message: ChatMessage }) {
  const fromUser = message.role === "user";
  return (
    <div className={`flex ${fromUser ? "justify-end" : "justify-start"}`}>
      <p
        className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-2 text-sm shadow-sm ${
          fromUser ? "bg-primary text-white" : "border border-line bg-white text-navy"
        }`}
      >
        <span className="sr-only">{fromUser ? "You: " : "Assistant: "}</span>
        {message.content}
      </p>
    </div>
  );
}

/** Freeform chat with the AI, which picks the document and fills in its fields from the conversation. */
export function DocumentChat({ draft, onChange }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Keep the latest message (or the typing indicator) in view.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, pending, error]);

  async function send() {
    const content = input.trim();
    if (!content || pending) return;

    const conversation: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(conversation);
    setInput("");
    setError(null);
    setPending(true);
    try {
      const result = await sendChatTurn(conversation, draft);
      setMessages([...conversation, { role: "assistant", content: result.reply }]);
      onChange(result.draft);
    } catch (err) {
      // Drop the unanswered message and give it back so the user can resend it.
      setMessages(messages);
      setInput(content);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send();
  }

  // Enter sends; Shift+Enter starts a new line. Ignore Enter while an IME is composing.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  }

  return (
    <div className="flex h-[32rem] flex-col rounded-lg border border-line bg-surface lg:h-[calc(100vh-10rem)]">
      <div
        ref={logRef}
        role="log"
        aria-label="Conversation"
        aria-live="polite"
        className="flex-1 space-y-3 overflow-y-auto p-4"
      >
        <Bubble message={{ role: "assistant", content: GREETING }} />
        {messages.map((message, index) => (
          <Bubble key={index} message={message} />
        ))}
        {pending && <p className="text-sm text-muted">Assistant is typing…</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2 border-t border-line bg-white p-4">
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex items-end gap-3">
          <textarea
            aria-label="Message"
            rows={2}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Type your answer… (Shift+Enter for a new line)"
            className={`${inputClass} resize-none`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className="rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-secondary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

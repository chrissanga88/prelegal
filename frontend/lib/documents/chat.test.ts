import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyDraft } from "./draft";
import { sendChatTurn, type ChatMessage } from "./chat";

const draft = createEmptyDraft();
const hello: ChatMessage[] = [{ role: "user", content: "Hello" }];

function mockFetch(impl: () => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sendChatTurn", () => {
  it("posts the messages and draft and returns the reply", async () => {
    const updated = { ...draft, documentType: "mutual-nda", fields: { governing_law: "Delaware" } };
    const fetchMock = mockFetch(() => jsonResponse({ reply: "Noted.", draft: updated }));

    const result = await sendChatTurn(hello, draft);

    expect(result).toEqual({ reply: "Noted.", draft: updated });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/chat");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ messages: hello, draft });
  });

  it("sends only a recent window of a long conversation, starting with the user", async () => {
    const fetchMock = mockFetch(() => jsonResponse({ reply: "ok", draft }));
    const long: ChatMessage[] = Array.from({ length: 81 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `m${i}`,
    }));

    await sendChatTurn(long, draft);

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const sent: ChatMessage[] = JSON.parse(init.body as string).messages;
    expect(sent).toHaveLength(59);
    expect(sent[0]).toEqual({ role: "user", content: "m22" });
    expect(sent.at(-1)).toEqual({ role: "user", content: "m80" });
  });

  it("surfaces the server's error message", async () => {
    mockFetch(() => jsonResponse({ detail: "The AI assistant is unavailable." }, 502));
    await expect(sendChatTurn(hello, draft)).rejects.toThrow("The AI assistant is unavailable.");
  });

  it("uses a generic message for validation errors and non-JSON responses", async () => {
    mockFetch(() => jsonResponse({ detail: [{ msg: "field required" }] }, 422));
    await expect(sendChatTurn(hello, draft)).rejects.toThrow("Something went wrong");

    mockFetch(() => Promise.resolve(new Response("<html>oops</html>", { status: 500 })));
    await expect(sendChatTurn(hello, draft)).rejects.toThrow("Something went wrong");
  });

  it("rejects a malformed success response", async () => {
    mockFetch(() => jsonResponse({ unexpected: true }));
    await expect(sendChatTurn(hello, draft)).rejects.toThrow("Something went wrong");

    mockFetch(() => jsonResponse({ reply: "Hi", draft: null }));
    await expect(sendChatTurn(hello, draft)).rejects.toThrow("Something went wrong");
  });

  it("reports network failures", async () => {
    mockFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    await expect(sendChatTurn(hello, draft)).rejects.toThrow("Couldn’t reach the server");
  });
});

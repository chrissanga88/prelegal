// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyDraft } from "@/lib/documents/draft";
import type { ChatMessage } from "@/lib/documents/chat";
import type { DocumentDraft } from "@/lib/documents/types";
import { DocumentChat, GREETING } from "./DocumentChat";

const initialData = createEmptyDraft();
let latest: DocumentDraft;
let latestMessages: ChatMessage[];
let fetchMock: ReturnType<typeof vi.fn>;

function Harness() {
  const [state, setState] = useState({ messages: [] as ChatMessage[], draft: initialData });
  return (
    <DocumentChat
      messages={state.messages}
      draft={state.draft}
      onTurn={(messages, draft) => {
        latest = draft;
        latestMessages = messages;
        setState({ messages, draft });
      }}
    />
  );
}

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sentBody(call: number) {
  const [, init] = fetchMock.mock.calls[call] as [string, RequestInit];
  return JSON.parse(init.body as string);
}

beforeEach(() => {
  latest = initialData;
  latestMessages = [];
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DocumentChat", () => {
  it("opens with the greeting", () => {
    render(<Harness />);
    expect(screen.getByRole("log").textContent).toContain(GREETING);
  });

  it("sends the message, shows the reply and updates the draft", async () => {
    const updated = { ...initialData, documentType: "mutual-nda", fields: { governing_law: "Delaware" } };
    fetchMock.mockResolvedValueOnce(reply({ reply: "Got it. Who is the other party?", draft: updated }));
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Message"), "Use Delaware law");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Got it. Who is the other party?")).toBeTruthy();
    expect(screen.getByText("Use Delaware law")).toBeTruthy();
    expect(latest).toEqual(updated);
    expect(latestMessages).toEqual([
      { role: "user", content: "Use Delaware law" },
      { role: "assistant", content: "Got it. Who is the other party?" },
    ]);
    expect(screen.getByLabelText("Message")).toHaveProperty("value", "");
    // The greeting is display-only; the API conversation starts with the user.
    expect(sentBody(0)).toEqual({
      messages: [{ role: "user", content: "Use Delaware law" }],
      draft: initialData,
    });
  });

  it("sends the whole conversation and the latest draft on the next turn", async () => {
    const updated = { ...initialData, documentType: "mutual-nda", fields: { governing_law: "Delaware" } };
    fetchMock
      .mockResolvedValueOnce(reply({ reply: "First reply", draft: updated }))
      .mockResolvedValueOnce(reply({ reply: "Second reply", draft: updated }));
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Message"), "one{Enter}");
    await screen.findByText("First reply");
    await user.type(screen.getByLabelText("Message"), "two{Enter}");
    await screen.findByText("Second reply");

    expect(sentBody(1)).toEqual({
      messages: [
        { role: "user", content: "one" },
        { role: "assistant", content: "First reply" },
        { role: "user", content: "two" },
      ],
      draft: updated,
    });
  });

  it("uses Shift+Enter for a new line instead of sending", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Message"), "line one{Shift>}{Enter}{/Shift}line two");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Message")).toHaveProperty("value", "line one\nline two");
  });

  it("does not send blank messages", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Message"), "   {Enter}");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Send" })).toHaveProperty("disabled", true);
  });

  it("shows a typing indicator and blocks sending while waiting", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((r) => (resolve = r)));
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Message"), "hello{Enter}");
    expect(screen.getByText("Assistant is typing…")).toBeTruthy();
    // The user's message shows straight away, before the reply.
    expect(screen.getByRole("log").textContent).toContain("hello");

    await user.type(screen.getByLabelText("Message"), "again{Enter}");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolve(reply({ reply: "Hi there", draft: initialData }));
    await screen.findByText("Hi there");
    expect(screen.queryByText("Assistant is typing…")).toBeNull();
  });

  it("shows the error and restores the message so it can be resent", async () => {
    fetchMock.mockResolvedValueOnce(reply({ detail: "The AI assistant is unavailable." }, 502));
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Message"), "hello{Enter}");

    expect((await screen.findByRole("alert")).textContent).toBe("The AI assistant is unavailable.");
    expect(screen.getByLabelText("Message")).toHaveProperty("value", "hello");
    expect(screen.getByRole("log").textContent).not.toContain("hello");
    expect(latest).toBe(initialData);
    expect(latestMessages).toEqual([]);

    fetchMock.mockResolvedValueOnce(reply({ reply: "Back again", draft: initialData }));
    await user.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Back again");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(sentBody(1).messages).toEqual([{ role: "user", content: "hello" }]);
  });
});

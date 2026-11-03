// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api";
import { resetSessionForTests, signIn, signOut, signUp, useSession } from "./session";
import { mockApi } from "./testing/mockApi";

const ADA = { email: "ada@example.com" };

beforeEach(() => resetSessionForTests());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useSession", () => {
  it("checks /api/auth/me once and reports the signed-in user", async () => {
    const calls = mockApi({ "GET /api/auth/me": { body: ADA } });
    const { result } = renderHook(() => useSession());
    expect(result.current).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current).toEqual({ status: "authenticated", session: ADA }));

    renderHook(() => useSession());
    expect(calls.filter((call) => call.path === "/api/auth/me")).toHaveLength(1);
  });

  it("is anonymous without a session", async () => {
    mockApi({ "GET /api/auth/me": { status: 401, body: { detail: "Please sign in to continue." } } });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current).toEqual({ status: "anonymous" }));
  });

  it("is anonymous when the server can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current).toEqual({ status: "anonymous" }));
  });
});

describe("signIn, signUp and signOut", () => {
  it("update the session", async () => {
    const calls = mockApi({
      "GET /api/auth/me": { status: 401 },
      "POST /api/auth/signin": { body: ADA },
      "POST /api/auth/signup": { status: 201, body: { email: "bob@example.com" } },
      "POST /api/auth/signout": { status: 204 },
    });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.status).toBe("anonymous"));

    await act(() => signIn("ada@example.com", "secret pass"));
    expect(result.current).toEqual({ status: "authenticated", session: ADA });
    expect(calls.at(-1)).toEqual({
      method: "POST",
      path: "/api/auth/signin",
      body: { email: "ada@example.com", password: "secret pass" },
    });

    await act(() => signOut());
    expect(result.current).toEqual({ status: "anonymous" });

    await act(() => signUp("bob@example.com", "secret pass"));
    expect(result.current).toEqual({ status: "authenticated", session: { email: "bob@example.com" } });
  });

  it("signIn rejects with the server's message and stays signed out", async () => {
    mockApi({
      "GET /api/auth/me": { status: 401 },
      "POST /api/auth/signin": { status: 401, body: { detail: "Incorrect email or password." } },
    });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.status).toBe("anonymous"));
    await expect(signIn("ada@example.com", "wrong")).rejects.toThrow("Incorrect email or password.");
    expect(result.current).toEqual({ status: "anonymous" });
  });

  it("signOut signs out locally even if the request fails", async () => {
    mockApi({ "GET /api/auth/me": { body: ADA }, "POST /api/auth/signout": { status: 500 } });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    await act(() => signOut().catch(() => {}));
    expect(result.current).toEqual({ status: "anonymous" });
  });

  it("any 401 from the API signs the user out", async () => {
    mockApi({ "GET /api/auth/me": { body: ADA }, "GET /api/documents": { status: 401 } });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    await act(() => apiRequest("/api/documents").catch(() => {}));
    expect(result.current).toEqual({ status: "anonymous" });
  });
});

// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readSession, signIn, signOut, useSession } from "./session";

const KEY = "prelegal.session";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("signIn", () => {
  it("accepts any non-empty email and password", () => {
    expect(signIn("  ada@example.com ", "secret")).toEqual({ email: "ada@example.com" });
    expect(readSession()).toEqual({ email: "ada@example.com" });
  });

  it.each([
    ["", "secret"],
    ["   ", "secret"],
    ["ada@example.com", ""],
    ["ada@example.com", "   "],
  ])("rejects email %j with password %j", (email, password) => {
    expect(signIn(email, password)).toBeNull();
    expect(readSession()).toBeNull();
  });

  it("never stores the password", () => {
    signIn("ada@example.com", "hunter2");
    expect(localStorage.getItem(KEY)).not.toContain("hunter2");
  });
});

describe("readSession", () => {
  it.each(["not json", "null", "{}", '{"email":42}', '{"email":"  "}'])(
    "treats %j as signed out",
    (raw) => {
      localStorage.setItem(KEY, raw);
      expect(readSession()).toBeNull();
    },
  );
});

describe("signOut", () => {
  it("clears the session", () => {
    signIn("ada@example.com", "secret");
    signOut();
    expect(readSession()).toBeNull();
  });
});

describe("useSession", () => {
  it("reflects sign-in and sign-out in the same tab", () => {
    const { result } = renderHook(() => useSession());
    expect(result.current).toEqual({ status: "anonymous" });

    act(() => void signIn("ada@example.com", "secret"));
    expect(result.current).toEqual({
      status: "authenticated",
      session: { email: "ada@example.com" },
    });

    act(() => signOut());
    expect(result.current).toEqual({ status: "anonymous" });
  });

  it("reacts to changes made in another tab", () => {
    const { result } = renderHook(() => useSession());
    act(() => {
      localStorage.setItem(KEY, JSON.stringify({ email: "bob@example.com" }));
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });
    expect(result.current).toEqual({
      status: "authenticated",
      session: { email: "bob@example.com" },
    });
  });
});

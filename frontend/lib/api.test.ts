import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest, setUnauthorizedHandler } from "./api";
import { mockApi } from "./testing/mockApi";

afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthorizedHandler(() => {});
});

describe("apiRequest", () => {
  it("sends JSON and returns the parsed body", async () => {
    const calls = mockApi({ "POST /api/things": { body: { id: 1 } } });
    await expect(apiRequest("/api/things", { method: "POST", body: { a: 1 } })).resolves.toEqual({ id: 1 });
    expect(calls).toEqual([{ method: "POST", path: "/api/things", body: { a: 1 } }]);
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.credentials).toBe("same-origin");
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
  });

  it("resolves undefined for 204 responses", async () => {
    mockApi({ "DELETE /api/things/1": { status: 204 } });
    await expect(apiRequest("/api/things/1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("uses the server's detail message", async () => {
    mockApi({ "GET /api/x": { status: 409, body: { detail: "Already exists." } } });
    const error = await apiRequest("/api/x").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, message: "Already exists." });
  });

  it("unwraps custom validation messages and hides others", async () => {
    mockApi({
      "POST /a": { status: 422, body: { detail: [{ msg: "Value error, Use at least 8 characters." }] } },
      "POST /b": { status: 422, body: { detail: [{ msg: "Field required" }] } },
    });
    await expect(apiRequest("/a", { method: "POST" })).rejects.toThrow("Use at least 8 characters.");
    await expect(apiRequest("/b", { method: "POST" })).rejects.toThrow("Something went wrong");
  });

  it("reports network failures and non-JSON responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(apiRequest("/x")).rejects.toMatchObject({ status: 0, message: expect.stringContaining("Couldn’t reach the server") });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 500 })));
    await expect(apiRequest("/x")).rejects.toThrow("Something went wrong");
  });

  it("calls the unauthorized handler on 401", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockApi({ "GET /api/me": { status: 401, body: { detail: "Please sign in to continue." } } });
    await expect(apiRequest("/api/me")).rejects.toThrow("Please sign in to continue.");
    expect(handler).toHaveBeenCalledOnce();
  });
});

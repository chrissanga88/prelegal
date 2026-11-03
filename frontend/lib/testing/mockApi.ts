import { vi } from "vitest";

/** A fake backend response: a JSON body (omit for 204) and a status (default 200). */
export type FakeResponse = { status?: number; body?: unknown };

type Handler = (body: unknown) => FakeResponse | Promise<FakeResponse>;

export type ApiCall = { method: string; path: string; body: unknown };

/**
 * Replaces `fetch` with a fake backend for tests. Routes are keyed by
 * "METHOD /path" (query strings included); a route may be a fixed response or
 * a function of the parsed JSON body. Unknown routes answer 404. Returns the
 * list of calls made, in order. Undo with `vi.unstubAllGlobals()`.
 */
export function mockApi(routes: Record<string, FakeResponse | Handler>): ApiCall[] {
  const calls: ApiCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string, init: RequestInit = {}) => {
      const method = init.method ?? "GET";
      const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
      calls.push({ method, path, body });
      const route = routes[`${method} ${path}`];
      const result = typeof route === "function" ? await route(body) : (route ?? { status: 404, body: { detail: "Not found" } });
      const status = result.status ?? 200;
      return new Response(status === 204 ? null : JSON.stringify(result.body ?? null), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return calls;
}

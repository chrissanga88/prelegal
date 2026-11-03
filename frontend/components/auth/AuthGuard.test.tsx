// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetSessionForTests } from "@/lib/session";
import { mockApi } from "@/lib/testing/mockApi";
import { AuthGuard } from "./AuthGuard";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

beforeEach(() => {
  resetSessionForTests();
  replace.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AuthGuard", () => {
  it("hides the content and redirects to sign in when signed out", async () => {
    mockApi({ "GET /api/auth/me": { status: 401 } });
    render(<AuthGuard>secret content</AuthGuard>);
    expect(screen.getByRole("status").textContent).toMatch(/Loading/);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByText("secret content")).toBeNull();
  });

  it("renders the content when signed in", async () => {
    mockApi({ "GET /api/auth/me": { body: { email: "ada@example.com" } } });
    render(<AuthGuard>secret content</AuthGuard>);
    expect(await screen.findByText("secret content")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});

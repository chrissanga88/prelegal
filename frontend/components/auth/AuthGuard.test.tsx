// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signIn } from "@/lib/session";
import { AuthGuard } from "./AuthGuard";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

beforeEach(() => {
  localStorage.clear();
  replace.mockClear();
});
afterEach(cleanup);

describe("AuthGuard", () => {
  it("hides the content and redirects to login when signed out", () => {
    render(<AuthGuard>secret content</AuthGuard>);
    expect(screen.queryByText("secret content")).toBeNull();
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("renders the content when signed in", () => {
    signIn("ada@example.com", "secret");
    render(<AuthGuard>secret content</AuthGuard>);
    expect(screen.getByText("secret content")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});

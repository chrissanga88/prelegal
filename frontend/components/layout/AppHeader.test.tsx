// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetSessionForTests } from "@/lib/session";
import { mockApi } from "@/lib/testing/mockApi";
import { AppHeader } from "./AppHeader";

vi.mock("next/navigation", () => ({ usePathname: () => "/documents/" }));

beforeEach(() => resetSessionForTests());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AppHeader", () => {
  it("shows navigation, the signed-in email and signs out", async () => {
    const calls = mockApi({
      "GET /api/auth/me": { body: { email: "ada@example.com" } },
      "POST /api/auth/signout": { status: 204 },
    });
    const user = userEvent.setup();
    render(<AppHeader />);

    expect(await screen.findByText("ada@example.com")).toBeTruthy();
    expect(screen.getByRole("link", { name: "My documents" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "New document" }).getAttribute("href")).toMatch(/^\/draft\/?$/);

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(calls.at(-1)).toMatchObject({ method: "POST", path: "/api/auth/signout" });
    expect(screen.queryByText("ada@example.com")).toBeNull();
  });
});

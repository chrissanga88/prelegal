// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readSession, signIn } from "@/lib/session";
import { AppHeader } from "./AppHeader";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("AppHeader", () => {
  it("shows the signed-in email and signs out", async () => {
    signIn("ada@example.com", "secret");
    const user = userEvent.setup();
    render(<AppHeader />);

    expect(screen.getByText("ada@example.com")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(readSession()).toBeNull();
    expect(screen.queryByText("ada@example.com")).toBeNull();
  });
});

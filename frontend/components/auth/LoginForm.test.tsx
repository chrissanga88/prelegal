// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readSession, signIn } from "@/lib/session";
import { LoginForm } from "./LoginForm";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

beforeEach(() => {
  localStorage.clear();
  replace.mockClear();
});
afterEach(cleanup);

describe("LoginForm", () => {
  it("shows an error and stays put when fields are empty", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("alert").textContent).toMatch(/email and password/);
    expect(readSession()).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("signs in with any email and password and opens the NDA creator", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "anything");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(readSession()).toEqual({ email: "ada@example.com" });
    expect(replace).toHaveBeenCalledWith("/draft/");
  });

  it("redirects a user who is already signed in", () => {
    signIn("ada@example.com", "secret");
    render(<LoginForm />);
    expect(replace).toHaveBeenCalledWith("/draft/");
  });
});

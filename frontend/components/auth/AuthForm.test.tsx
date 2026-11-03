// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetSessionForTests } from "@/lib/session";
import { mockApi } from "@/lib/testing/mockApi";
import { AuthForm } from "./AuthForm";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const SIGNED_OUT = { "GET /api/auth/me": { status: 401 } };

beforeEach(() => {
  resetSessionForTests();
  replace.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function fillIn(email: string, password: string) {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText("Email"), email);
  if (password) await user.type(screen.getByLabelText(/^Password/), password);
  return user;
}

describe("AuthForm sign in", () => {
  it("validates before calling the API", async () => {
    const calls = mockApi(SIGNED_OUT);
    render(<AuthForm mode="signin" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("alert").textContent).toMatch(/email and password/);
    expect(calls.map((call) => call.path)).not.toContain("/api/auth/signin");
  });

  it("signs in and opens the user's documents", async () => {
    const calls = mockApi({ ...SIGNED_OUT, "POST /api/auth/signin": { body: { email: "ada@example.com" } } });
    render(<AuthForm mode="signin" />);
    const user = await fillIn("ada@example.com", "secret pass");

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/documents/"));
    expect(calls.at(-1)?.body).toEqual({ email: "ada@example.com", password: "secret pass" });
  });

  it("shows the server's error and lets the user retry", async () => {
    mockApi({
      ...SIGNED_OUT,
      "POST /api/auth/signin": { status: 401, body: { detail: "Incorrect email or password." } },
    });
    render(<AuthForm mode="signin" />);
    const user = await fillIn("ada@example.com", "wrong pass");

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Incorrect email or password.");
    expect(screen.getByRole("button", { name: "Sign in" })).toHaveProperty("disabled", false);
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects a user who is already signed in", async () => {
    mockApi({ "GET /api/auth/me": { body: { email: "ada@example.com" } } });
    render(<AuthForm mode="signin" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/documents/"));
  });

  it("links to sign up", () => {
    mockApi(SIGNED_OUT);
    render(<AuthForm mode="signin" />);
    expect(screen.getByRole("link", { name: "Create an account" }).getAttribute("href")).toMatch(/^\/signup\/?$/);
  });
});

describe("AuthForm sign up", () => {
  it("requires a password of at least 8 characters", async () => {
    const calls = mockApi(SIGNED_OUT);
    render(<AuthForm mode="signup" />);
    const user = await fillIn("ada@example.com", "short");

    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByRole("alert").textContent).toMatch(/at least 8 characters/);
    expect(calls.map((call) => call.path)).not.toContain("/api/auth/signup");
  });

  it("creates the account and opens the user's documents", async () => {
    const calls = mockApi({ ...SIGNED_OUT, "POST /api/auth/signup": { status: 201, body: { email: "ada@example.com" } } });
    render(<AuthForm mode="signup" />);
    const user = await fillIn(" ada@example.com ", "long enough");

    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/documents/"));
    expect(calls.at(-1)).toMatchObject({
      path: "/api/auth/signup",
      body: { email: "ada@example.com", password: "long enough" },
    });
  });

  it("shows when the email is already registered", async () => {
    mockApi({
      ...SIGNED_OUT,
      "POST /api/auth/signup": { status: 409, body: { detail: "An account with this email already exists." } },
    });
    render(<AuthForm mode="signup" />);
    const user = await fillIn("ada@example.com", "long enough");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/already exists/);
  });
});

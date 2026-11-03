// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import NotFound from "./not-found";

afterEach(cleanup);

describe("NotFound", () => {
  it("explains the problem and links back into the app", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go to my documents" }).getAttribute("href")).toMatch(/^\/documents\/?$/);
  });
});

// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDefaultNda } from "@/lib/nda/coverPage";
import type { NdaData } from "@/lib/nda/types";
import { NdaForm } from "./NdaForm";

const initialData = createDefaultNda("2026-10-30");
let latest: NdaData;

function Harness() {
  const [data, setData] = useState(initialData);
  return (
    <NdaForm
      data={data}
      onChange={(next) => {
        latest = next;
        setData(next);
      }}
    />
  );
}

beforeEach(() => {
  latest = initialData;
});
afterEach(cleanup);

describe("NdaForm term years", () => {
  it("lets the user clear the field and type a new value", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText(/MNDA term in years/);

    await user.clear(input);
    expect(input).toHaveProperty("value", "");
    expect(latest.mndaTerm).toEqual({ kind: "expires", years: 1 });

    await user.type(input, "3");
    expect(input).toHaveProperty("value", "3");
    expect(latest.mndaTerm).toEqual({ kind: "expires", years: 3 });
  });

  it("ignores non-digits and reverts to the last valid value on blur", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText(/MNDA term in years/);

    await user.clear(input);
    await user.type(input, "2.5e");
    expect(input).toHaveProperty("value", "25");
    expect(latest.mndaTerm).toEqual({ kind: "expires", years: 25 });

    await user.clear(input);
    await user.type(input, "0");
    expect(latest.mndaTerm).toEqual({ kind: "expires", years: 25 });
    await user.tab();
    expect(input).toHaveProperty("value", "25");
  });

  it("keeps the MNDA term years when switching to open-ended and back", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.clear(screen.getByLabelText(/MNDA term in years/));
    await user.type(screen.getByLabelText(/MNDA term in years/), "3");
    await user.click(screen.getByLabelText("Continues until terminated"));
    expect(latest.mndaTerm).toEqual({ kind: "untilTerminated" });

    const [expiresRadio] = document.querySelectorAll<HTMLInputElement>(
      'input[type="radio"][name="mndaTerm"]',
    );
    await user.click(expiresRadio);
    expect(latest.mndaTerm).toEqual({ kind: "expires", years: 3 });
  });

  it("keeps the confidentiality years when switching to perpetual and back", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText(/Confidentiality term in years/);

    await user.clear(input);
    await user.type(input, "5");
    await user.click(screen.getByLabelText("In perpetuity"));
    expect(latest.confidentialityTerm).toEqual({ kind: "perpetual" });

    const [yearsRadio] = document.querySelectorAll<HTMLInputElement>(
      'input[type="radio"][name="confidentialityTerm"]',
    );
    await user.click(yearsRadio);
    expect(latest.confidentialityTerm).toEqual({ kind: "years", years: 5 });
  });
});

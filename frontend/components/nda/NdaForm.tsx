"use client";

import type { ReactNode } from "react";
import type { NdaData, Party } from "@/lib/nda/types";

type Props = {
  data: NdaData;
  onChange: (data: NdaData) => void;
};

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
      {children}
    </label>
  );
}

function Fieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5">
      <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

function YearsInput({
  value,
  disabled,
  onChange,
  label,
}: {
  value: number;
  disabled: boolean;
  onChange: (years: number) => void;
  label: string;
}) {
  return (
    <input
      type="number"
      min={1}
      max={99}
      aria-label={label}
      className={`${inputClass} w-20`}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
    />
  );
}

export function NdaForm({ data, onChange }: Props) {
  const update = <K extends keyof NdaData>(key: K, value: NdaData[K]) =>
    onChange({ ...data, [key]: value });

  const updateParty = (index: 0 | 1, field: keyof Party, value: string) => {
    const parties: NdaData["parties"] = [...data.parties];
    parties[index] = { ...parties[index], [field]: value };
    update("parties", parties);
  };

  // Year counts shown in the inputs; they reset to 1 when the open-ended option is chosen.
  const mndaYears = data.mndaTerm.kind === "expires" ? data.mndaTerm.years : 1;
  const confidentialityYears =
    data.confidentialityTerm.kind === "years" ? data.confidentialityTerm.years : 1;

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <Fieldset legend="Agreement">
        <Field label="Purpose" hint="How Confidential Information may be used">
          <textarea
            className={inputClass}
            rows={3}
            value={data.purpose}
            onChange={(e) => update("purpose", e.target.value)}
          />
        </Field>

        <Field label="Effective Date">
          <input
            type="date"
            className={inputClass}
            value={data.effectiveDate}
            onChange={(e) => update("effectiveDate", e.target.value)}
          />
        </Field>

        <div className="space-y-2">
          <span className="text-sm font-medium text-zinc-800">MNDA Term</span>
          <span className="block text-xs text-zinc-500">The length of this MNDA</span>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name="mndaTerm"
              checked={data.mndaTerm.kind === "expires"}
              onChange={() => update("mndaTerm", { kind: "expires", years: mndaYears })}
            />
            Expires
            <YearsInput
              label="MNDA term in years"
              value={mndaYears}
              disabled={data.mndaTerm.kind !== "expires"}
              onChange={(years) => update("mndaTerm", { kind: "expires", years })}
            />
            year(s) from Effective Date
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name="mndaTerm"
              checked={data.mndaTerm.kind === "untilTerminated"}
              onChange={() => update("mndaTerm", { kind: "untilTerminated" })}
            />
            Continues until terminated
          </label>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium text-zinc-800">Term of Confidentiality</span>
          <span className="block text-xs text-zinc-500">
            How long Confidential Information is protected
          </span>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name="confidentialityTerm"
              checked={data.confidentialityTerm.kind === "years"}
              onChange={() =>
                update("confidentialityTerm", { kind: "years", years: confidentialityYears })
              }
            />
            <YearsInput
              label="Confidentiality term in years"
              value={confidentialityYears}
              disabled={data.confidentialityTerm.kind !== "years"}
              onChange={(years) => update("confidentialityTerm", { kind: "years", years })}
            />
            year(s) from Effective Date
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name="confidentialityTerm"
              checked={data.confidentialityTerm.kind === "perpetual"}
              onChange={() => update("confidentialityTerm", { kind: "perpetual" })}
            />
            In perpetuity
          </label>
        </div>
      </Fieldset>

      <Fieldset legend="Governing Law & Jurisdiction">
        <Field label="Governing Law" hint="State whose laws govern the MNDA">
          <input
            className={inputClass}
            placeholder="Delaware"
            value={data.governingLaw}
            onChange={(e) => update("governingLaw", e.target.value)}
          />
        </Field>
        <Field label="Jurisdiction" hint="City or county and state of the courts">
          <input
            className={inputClass}
            placeholder="New Castle, DE"
            value={data.jurisdiction}
            onChange={(e) => update("jurisdiction", e.target.value)}
          />
        </Field>
        <Field label="MNDA Modifications" hint="Optional changes to the Standard Terms">
          <textarea
            className={inputClass}
            rows={2}
            value={data.modifications}
            onChange={(e) => update("modifications", e.target.value)}
          />
        </Field>
      </Fieldset>

      {([0, 1] as const).map((index) => (
        <Fieldset key={index} legend={`Party ${index + 1}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Print Name">
              <input
                className={inputClass}
                value={data.parties[index].printName}
                onChange={(e) => updateParty(index, "printName", e.target.value)}
              />
            </Field>
            <Field label="Title">
              <input
                className={inputClass}
                value={data.parties[index].title}
                onChange={(e) => updateParty(index, "title", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Company">
            <input
              className={inputClass}
              value={data.parties[index].company}
              onChange={(e) => updateParty(index, "company", e.target.value)}
            />
          </Field>
          <Field label="Notice Address" hint="Email or postal address">
            <input
              className={inputClass}
              value={data.parties[index].noticeAddress}
              onChange={(e) => updateParty(index, "noticeAddress", e.target.value)}
            />
          </Field>
        </Fieldset>
      ))}
    </form>
  );
}

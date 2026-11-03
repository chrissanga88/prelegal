/** Shared Tailwind classes, so every form and button looks the same. */

export const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-navy shadow-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export const buttonClass = {
  /** Form submissions (purple, per the brand guidelines). */
  submit: `${buttonBase} bg-secondary text-white hover:bg-secondary-hover focus-visible:ring-secondary`,
  /** Primary actions that aren't form submissions, e.g. New document, Download PDF. */
  primary: `${buttonBase} bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary`,
  /** Secondary actions. */
  outline: `${buttonBase} border border-line bg-white text-navy hover:bg-surface focus-visible:ring-primary`,
  /** Destructive actions. */
  danger: `${buttonBase} bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger`,
};

/** White panel used for cards, tables and the document preview. */
export const cardClass = "rounded-xl border border-line bg-white shadow-sm";

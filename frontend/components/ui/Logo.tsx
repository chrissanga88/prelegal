/** The Prelegal wordmark: a yellow accent tile and the product name. */
export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-lg bg-accent font-serif text-lg font-bold text-navy"
      >
        P
      </span>
      <span className={`text-lg font-bold tracking-tight ${inverted ? "text-white" : "text-navy"}`}>
        Prelegal
      </span>
    </span>
  );
}

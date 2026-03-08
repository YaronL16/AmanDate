export function MatchesPage() {
  return (
    <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-7 shadow-[0_12px_32px_rgba(23,80,88,0.08)]">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent-primary)]" />
        <h2 className="text-2xl font-semibold tracking-tight">Matches</h2>
      </div>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Matches list and chat deep links will be implemented in Phase 5.
      </p>
    </section>
  )
}

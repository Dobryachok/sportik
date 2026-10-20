export function CompatibilityScore({ value }: { value: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-accent/40 bg-accent/10 px-5 py-3 text-center">
      <p className="text-3xl font-bold leading-none text-accent">{value}%</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">совпадение</p>
    </div>
  )
}

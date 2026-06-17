/** Compact legend for the shaded crisis bands on the time-series charts. Kept
 * off the plot so adjacent windows (2020 / 2022) never overprint each other. */
export default function CrisisBandLegend({
  windows,
}: {
  windows: { shortName: string }[];
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
        Shaded
      </span>
      {windows.map((w) => (
        <span key={w.shortName} className="flex items-center gap-1.5 text-[11px] text-ink-muted">
          <span aria-hidden className="h-2.5 w-3 border border-border-strong bg-[#11161a]/10" />
          {w.shortName}
        </span>
      ))}
    </div>
  );
}

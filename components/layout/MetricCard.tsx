import { cn } from "@/lib/utils";

/** Key-figure block: hairline top rule, small label, tabular value. */
export default function MetricCard({
  label,
  value,
  context,
  status,
  accentColor,
  className,
}: {
  label: string;
  value: string;
  context?: string;
  status?: string;
  accentColor?: string;
  className?: string;
}) {
  return (
    <div className={cn("border-t border-border-strong pt-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-subhead text-[11px] font-medium leading-snug text-ink-muted">
          {label}
        </span>
        {status && (
          <span className="font-mono text-[10px] text-ink-faint">{status}</span>
        )}
      </div>
      <div
        className="tabular mt-1 text-[21px] font-semibold leading-none tracking-tight text-ink"
        style={accentColor ? { color: accentColor } : undefined}
      >
        {value}
      </div>
      {context && (
        <p className="mt-1 text-[11.5px] leading-snug text-ink-faint">{context}</p>
      )}
    </div>
  );
}

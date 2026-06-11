import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Figure: a chart or table presented as a numbered-free research figure.
 * A single strong top rule and a caption; no card chrome, no boxes around
 * everything. `framed` adds a hairline enclosure for dense tables. */
export default function ExhibitPanel({
  title,
  subtitle,
  children,
  note,
  className,
  actions,
  framed = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  note?: string;
  className?: string;
  actions?: ReactNode;
  /** Hairline enclosure, used for tables that need containment. */
  framed?: boolean;
}) {
  return (
    <figure className={cn("min-w-0 border-t-2 border-ink", className)}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-3 pt-2.5">
        <div>
          <h3 className="font-subhead text-[14.5px] font-semibold leading-snug text-ink">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-[12px] text-ink-muted">{subtitle}</p>
          )}
        </div>
        {actions}
      </figcaption>
      <div className={cn(framed && "border border-border-soft bg-panel")}>{children}</div>
      {note && (
        <p className="mt-2 max-w-[88ch] text-[11.5px] leading-relaxed text-ink-faint">
          {note}
        </p>
      )}
    </figure>
  );
}

"use client";

import { cn } from "@/lib/utils";

/** Document-style selector: quiet text tabs with an ink underline on the
 * active option, closer to a research index than SaaS segmented controls. */
export default function Tabs<T extends string>({
  options,
  value,
  onChange,
  labels,
  ariaLabel,
  size = "sm",
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  labels?: Partial<Record<T, string>>;
  ariaLabel: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-baseline gap-1 border-b border-divider"
    >
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option)}
            className={cn(
              "-mb-px border-b-2 font-mono uppercase tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-strat-gmv",
              size === "sm" ? "px-2 pb-1.5 pt-1 text-[10.5px]" : "px-2.5 pb-1.5 pt-1 text-[11.5px]",
              active
                ? "border-ink font-semibold text-ink"
                : "border-transparent text-ink-muted hover:border-border-strong hover:text-ink-secondary",
            )}
          >
            {labels?.[option] ?? option}
          </button>
        );
      })}
    </div>
  );
}

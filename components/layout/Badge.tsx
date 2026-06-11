import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  neutral: "border-border-strong text-ink-secondary",
  teal: "border-strat-ra/50 text-strat-ra",
  blue: "border-strat-gmv/50 text-strat-gmv",
  violet: "border-strat-ms/50 text-strat-ms",
  amber: "border-regime-watch/50 text-regime-watch",
  green: "border-regime-normal/50 text-regime-normal",
  red: "border-regime-defensive/50 text-regime-defensive",
  muted: "border-border-soft text-ink-muted",
} as const;

export type BadgeTone = keyof typeof TONES;

export default function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[2px] border bg-panel px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

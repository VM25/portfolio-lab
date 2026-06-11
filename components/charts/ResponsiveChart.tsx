"use client";

import { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";
import { useMounted } from "@/lib/use-mounted";

/** Fixed-height chart frame. The parent reserves space immediately, while the
 * Recharts ResponsiveContainer is only mounted on the client once the box is
 * measurable, so the width(-1) height(-1) warning never fires (build-time
 * prerender or first paint). */
export default function ResponsiveChart({
  height,
  ariaLabel,
  className,
  children,
}: {
  height: number;
  ariaLabel?: string;
  className?: string;
  children: ReactElement;
}) {
  const mounted = useMounted();
  return (
    <div
      style={{ height }}
      className={`w-full min-w-0${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={ariaLabel}
    >
      {mounted ? (
        // Fixed numeric height (never -1) with percentage width avoids the
        // ResponsiveContainer width(-1)/height(-1) warning on its first pass.
        <ResponsiveContainer width="100%" height={height} minWidth={0}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}

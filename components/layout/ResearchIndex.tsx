"use client";

import { useEffect, useState } from "react";
import { PHASE_ORDER, RESEARCH_FLOW } from "@/lib/research-flow";
import { cn } from "@/lib/utils";

/** The contents rail as a map of the research flow: modules grouped by phase,
 * numbered to match each section's running-head, with the reader's current
 * module tracked by scroll position. */
export default function ResearchIndex() {
  const [active, setActive] = useState<string>(RESEARCH_FLOW[0].id);

  useEffect(() => {
    const sections = RESEARCH_FLOW.map((m) => document.getElementById(m.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    const observer = new IntersectionObserver(
      (entries) => {
        // The topmost section currently intersecting the upper viewport wins.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Research map" className="text-[12px]">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
        Research map
      </p>
      <ol className="space-y-3.5">
        {PHASE_ORDER.map((phase) => {
          const items = RESEARCH_FLOW.filter((m) => m.phase === phase);
          const phaseActive = items.some((m) => m.id === active);
          return (
            <li key={phase}>
              <p
                className={cn(
                  "mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors",
                  phaseActive ? "text-ink" : "text-ink-faint",
                )}
              >
                {phase}
              </p>
              <ul className="space-y-px">
                {items.map((m) => {
                  const isActive = m.id === active;
                  return (
                    <li key={m.id}>
                      <a
                        href={`#${m.id}`}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                          "flex items-baseline gap-2 rounded-[2px] py-1 pl-2 pr-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-strat-gmv",
                          isActive
                            ? "bg-highlight font-medium text-ink"
                            : "text-ink-muted hover:text-ink-secondary",
                        )}
                      >
                        <span
                          className={cn(
                            "tabular font-mono text-[10.5px]",
                            isActive ? "text-strat-gmv" : "text-ink-faint",
                          )}
                        >
                          {m.num}
                        </span>
                        <span className="leading-snug">{m.label}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

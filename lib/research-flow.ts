/** The research pipeline as one ordered sequence. Order is load-bearing
 * (premise before evidence before boundaries), so the numbering is real
 * information, not decorative scaffolding. The nav map and each section's
 * module marker both read from this single source. */

export type ModulePhase = "Setup" | "Evidence" | "Diagnostics" | "Boundaries";

export type ResearchModule = {
  id: string;
  /** Two-digit index shown in the map and the section running-head. */
  num: string;
  /** Functional module name. */
  label: string;
  phase: ModulePhase;
};

export const RESEARCH_FLOW: ResearchModule[] = [
  { id: "premise", num: "01", label: "Premise", phase: "Setup" },
  { id: "universe", num: "02", label: "Universe & signals", phase: "Setup" },
  { id: "methods", num: "03", label: "Allocation rules", phase: "Setup" },
  { id: "protocol", num: "04", label: "Backtest protocol", phase: "Setup" },
  { id: "evidence", num: "05", label: "Full-sample evidence", phase: "Evidence" },
  { id: "risk", num: "06", label: "Drawdown & tail risk", phase: "Evidence" },
  { id: "regimes", num: "07", label: "Regime response", phase: "Evidence" },
  { id: "stress", num: "08", label: "Stress windows", phase: "Evidence" },
  { id: "factors", num: "09", label: "Factor attribution", phase: "Diagnostics" },
  { id: "implementation", num: "10", label: "Implementation", phase: "Diagnostics" },
  { id: "interpretation", num: "11", label: "Interpretation", phase: "Boundaries" },
  { id: "limits", num: "12", label: "Boundary conditions", phase: "Boundaries" },
];

export const PHASE_ORDER: ModulePhase[] = [
  "Setup",
  "Evidence",
  "Diagnostics",
  "Boundaries",
];

export function moduleById(id: string): ResearchModule | undefined {
  return RESEARCH_FLOW.find((m) => m.id === id);
}

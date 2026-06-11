import { validationSummary } from "@/lib/data/validation";
import Badge from "./Badge";

/** Badge copy: a warning-status run with all checks passing is reported as
 * "passed · N warning(s)", a documented data-coverage caveat, not a failure. */
function badgeText() {
  const v = validationSummary;
  const failed = v.checks.filter((c) => c.status === "fail").length;
  const warnings = v.warnings.length;
  if (failed > 0) return { text: `Validation failed · ${failed} check(s)`, tone: "red" as const };
  if (warnings > 0)
    return {
      text: `Validation passed · ${warnings} warning${warnings > 1 ? "s" : ""}`,
      tone: "green" as const,
    };
  return { text: `Validation passed · ${v.checks.length}/${v.checks.length} checks`, tone: "green" as const };
}

export default function ValidationLedger({ compact = false }: { compact?: boolean }) {
  const v = validationSummary;
  const passed = v.checks.filter((c) => c.status === "pass").length;
  const badge = badgeText();

  if (compact) {
    return <Badge tone={badge.tone}>{badge.text}</Badge>;
  }

  return (
    <div className="border border-border-soft bg-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-divider px-5 py-3">
        <div>
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
            Validation ledger
          </span>
          <h3 className="font-subhead text-[15.5px] font-semibold text-ink">
            Automated research-engine checks
          </h3>
        </div>
        <Badge tone={badge.tone}>{badge.text}</Badge>
      </div>
      <div className="px-5 py-3.5">
        <p className="text-[12px] text-ink-muted">
          {passed} of {v.checks.length} checks passed · ledger generated{" "}
          <span className="font-mono">{v.generatedAt.slice(0, 10)}</span>
        </p>
        <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {v.checks.map((c) => (
            <li
              key={c.name}
              className="flex items-baseline justify-between gap-3 border-b border-divider/60 pb-1 text-[11.5px]"
            >
              <span className="font-mono text-ink-secondary">
                {c.name.replaceAll("_", " ")}
              </span>
              <span
                className={
                  c.status === "pass"
                    ? "font-mono text-[10px] font-semibold uppercase text-regime-normal"
                    : "font-mono text-[10px] font-semibold uppercase text-regime-defensive"
                }
              >
                {c.status}
              </span>
            </li>
          ))}
        </ul>
        {v.warnings.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-divider pt-3">
            {v.warnings.map((w) => (
              <p key={w.name} className="text-[11.5px] leading-relaxed text-ink-muted">
                <span className="font-mono font-semibold uppercase text-regime-watch">
                  warning · {w.name.replaceAll("_", " ")}:
                </span>{" "}
                {w.message}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

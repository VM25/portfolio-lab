import { moduleById } from "@/lib/research-flow";

/** Module running-head. The section's index and functional name (drawn from
 * the shared research flow) sit in a left column that lines up with the nav
 * map; the title and dek run beside them. This reads as a numbered analytical
 * module, not a blog kicker, because the number is the section's real position
 * in the pipeline. */
export default function SectionHeader({
  moduleId,
  title,
  thesis,
  note,
}: {
  moduleId: string;
  title: string;
  thesis?: string;
  note?: string;
}) {
  const mod = moduleById(moduleId);

  return (
    <header className="mb-8 border-t-2 border-ink pt-3">
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-[88px_minmax(0,1fr)]">
        <div className="flex items-baseline gap-2 sm:flex-col sm:gap-1">
          <span className="font-mono text-[13px] font-medium tabular text-ink">
            {mod?.num ?? "--"}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            {mod?.phase ?? ""}
          </span>
        </div>
        <div className="max-w-[680px]">
          <h2 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.01em] text-ink sm:text-[26px]">
            {title}
          </h2>
          {thesis && (
            <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{thesis}</p>
          )}
          {note && (
            <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">{note}</p>
          )}
        </div>
      </div>
    </header>
  );
}

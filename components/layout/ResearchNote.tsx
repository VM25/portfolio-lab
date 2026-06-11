/** Analyst annotation: a compact margin note attached to a figure.
 * Finding as the lead sentence; evidence and caveat run as prose. */
export default function ResearchNote({
  finding,
  evidence,
  interpretation,
  limitation,
}: {
  finding: string;
  evidence: string;
  interpretation: string;
  limitation?: string;
}) {
  return (
    <aside className="border-l-2 border-border-strong pl-4">
      <p className="font-subhead text-[13px] font-semibold leading-snug text-ink">{finding}</p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
        {evidence} {interpretation}
      </p>
      {limitation && (
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-faint">
          Caveat: {limitation}
        </p>
      )}
    </aside>
  );
}

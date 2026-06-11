import { ReactNode } from "react";
import ValidationLedger from "./ValidationLedger";
import ResearchIndex from "./ResearchIndex";
import RegimeRibbon from "./RegimeRibbon";

/** Document shell: a masthead carrying the regime-ribbon identity strip, a
 * sticky research-map rail on its own surface layer, and a single reading
 * column. Built like an analytical environment, not an article. */
export default function ResearchShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b border-border-strong bg-bg-primary">
        <div className="mx-auto flex max-w-[1340px] flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 pb-0 pt-4 sm:px-8">
          <a href="#top" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Portfolio Risk &amp; Allocation Analytics
          </a>
          <div className="flex items-baseline gap-4">
            <span className="hidden text-[12px] text-ink-muted sm:block">Vatsal Maniar</span>
            <ValidationLedger compact />
          </div>
        </div>
        {/* Identity strip: the regime record runs the full masthead width */}
        <div className="mx-auto mt-3 max-w-[1340px] px-5 sm:px-8">
          <RegimeRibbon variant="marker" />
        </div>
      </header>

      <div
        id="top"
        className="mx-auto grid max-w-[1340px] lg:grid-cols-[208px_minmax(0,1fr)]"
      >
        <aside className="sticky top-0 hidden max-h-screen self-start overflow-y-auto border-r border-border-soft bg-bg-rail px-5 py-7 lg:block">
          <ResearchIndex />
        </aside>

        <main className="min-w-0 px-5 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

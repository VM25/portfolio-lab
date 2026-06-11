"use client";

import { useState } from "react";
import ExhibitPanel from "@/components/layout/ExhibitPanel";
import DataTable, { type Column } from "@/components/layout/DataTable";
import Tabs from "@/components/layout/Tabs";
import { SHORT_NAMES, STRATEGY_COLORS, STRATEGY_ORDER, isBenchmark } from "@/lib/chart-utils";
import { formatNumber, formatPercent } from "@/lib/formatters";
import type { FactorExposure, LookbackWindow } from "@/lib/types";
import FactorExposureChart from "./FactorExposureChart";

const LOOKBACKS: LookbackWindow[] = ["6M", "1Y", "3Y"];

export type FactorData = Record<LookbackWindow, FactorExposure[]>;

const columns: Column<FactorExposure>[] = [
  {
    key: "strategy",
    header: "Strategy",
    render: (f) => (
      <span className="flex items-center gap-2 text-ink">
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-sm"
          style={{ backgroundColor: STRATEGY_COLORS[f.strategy] }}
        />
        {SHORT_NAMES[f.strategy] ?? f.strategy}
        {isBenchmark(f.strategy) && (
          <span className="font-mono text-[9.5px] uppercase text-ink-faint">bench</span>
        )}
      </span>
    ),
  },
  {
    key: "alpha",
    header: "Intercept (ann.)",
    align: "right",
    render: (f) => (
      <span>
        {formatPercent(f.alphaAnnualized)}
        {f.alphaTStat != null && (
          <span className="ml-1 font-mono text-[10px] text-ink-faint">
            t={formatNumber(f.alphaTStat, 1)}
          </span>
        )}
      </span>
    ),
  },
  { key: "mkt", header: "Mkt β", align: "right", render: (f) => formatNumber(f.marketBeta, 2) },
  { key: "smb", header: "SMB", align: "right", render: (f) => formatNumber(f.smb, 2) },
  { key: "hml", header: "HML", align: "right", render: (f) => formatNumber(f.hml, 2) },
  { key: "rmw", header: "RMW", align: "right", render: (f) => formatNumber(f.rmw, 2) },
  { key: "cma", header: "CMA", align: "right", render: (f) => formatNumber(f.cma, 2) },
  { key: "r2", header: "R²", align: "right", render: (f) => formatNumber(f.rSquared, 2) },
  { key: "n", header: "Obs", align: "right", render: (f) => String(f.observations) },
];

export default function FactorExplorer({ data }: { data: FactorData }) {
  const [lookback, setLookback] = useState<LookbackWindow>("1Y");
  const exposures = data[lookback];
  const ordered = [...exposures].sort(
    (a, b) =>
      [...STRATEGY_ORDER, "SPY", "60/40"].indexOf(a.strategy as never) -
      [...STRATEGY_ORDER, "SPY", "60/40"].indexOf(b.strategy as never),
  );
  const strategiesOnly = ordered.filter((f) => !isBenchmark(f.strategy));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          options={LOOKBACKS}
          value={lookback}
          onChange={setLookback}
          ariaLabel="Estimation lookback window for factor exposures"
          size="md"
        />
        <span className="font-mono text-[11px] text-ink-faint">
          Daily excess returns vs Fama-French 5 factors, full sample
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <ExhibitPanel
          title="Factor loadings by strategy"
          subtitle={`OLS coefficients on daily Fama-French factors · ${lookback} lookback strategies`}
          note="The zero line separates positive from negative loadings. R² is shown in the table as model fit, not strategy quality. Benchmarks are omitted from the chart for readability."
        >
          <FactorExposureChart exposures={strategiesOnly} series={strategiesOnly.map((f) => f.strategy)} />
        </ExhibitPanel>

        <div className="space-y-3 text-[13px] leading-relaxed text-ink-secondary">
          <p>
            <span className="font-semibold text-ink">How to read this.</span>{" "}
            Market beta tells you how much of each strategy is simply equity
            exposure: the defensive strategies hold betas well below the
            equity benchmarks, which explains most of their drawdown behavior
            before any other factor matters.
          </p>
          <p>
            The Fama-French model is used as an equity-factor exposure
            diagnostic. Because the strategies include bonds, TIPS, gold,
            commodities, credit, REITs, and cash proxies, the model does not
            fully explain all sources of multi-asset return and risk, lower
            R² for bond- and commodity-heavy strategies is expected, and is
            itself informative. A fuller multi-asset attribution model would
            also include term, credit, inflation, commodity, and real-asset
            factors.
          </p>
          <p className="border border-border-soft bg-panel-deep px-3.5 py-2.5 font-mono text-[11.5px] text-ink-muted">
            The intercept is treated as residual return unexplained by this
            limited factor model, not as proof of investment skill. Factor
            regressions diagnose exposures; they do not prove skill or future
            alpha.
          </p>
        </div>
      </div>

      <ExhibitPanel
        title="Factor exposure table"
        subtitle={`All series · ${lookback} lookback · daily Fama-French 5-factor regression · Intercept: diagnostic residual return, not proof of skill`}
        note="The intercept is annualized from the daily regression intercept and treated as residual return unexplained by this limited factor model, not as proof of alpha or skill. In particular, the Max Sharpe intercept is not interpreted as tradable alpha: the regression is equity-factor-only, the strategy holds multi-asset exposures, and the figure is sensitive to lookback construction and transaction-cost assumptions. t-statistics are shown for the intercept only."
      >
        <DataTable columns={columns} rows={ordered} rowKey={(f) => f.strategy} />
      </ExhibitPanel>
    </div>
  );
}

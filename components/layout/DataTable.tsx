import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column<Row> = {
  key: string;
  header: ReactNode;
  align?: "left" | "right";
  render: (row: Row) => ReactNode;
};

/** Research table: horizontal rules only, small-caps headers over a strong
 * rule, right-aligned tabular numbers, soft highlight on hover. */
export default function DataTable<Row>({
  columns,
  rows,
  rowKey,
  className,
  dense = false,
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  className?: string;
  dense?: boolean;
}) {
  return (
    <div className={cn("thin-scroll overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
        <thead>
          <tr className="border-b-2 border-ink">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  "whitespace-nowrap px-3 pb-2 pt-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted",
                  col.align === "right" ? "text-right" : "text-left",
                  dense && "px-2 pb-1.5 pt-2",
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="transition-colors hover:bg-highlight">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "tabular whitespace-nowrap px-3 py-2.5 text-ink-secondary",
                    col.align === "right" ? "text-right font-mono text-[12px]" : "text-left",
                    dense && "px-2 py-1.5",
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

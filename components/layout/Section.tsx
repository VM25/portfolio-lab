import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A section renders as an analytical module. Every section uses the same
 * page background and spacing; no section is visually isolated. */
export default function Section({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("module-reveal scroll-mt-6 py-10 sm:py-12", className)}
    >
      {children}
    </section>
  );
}

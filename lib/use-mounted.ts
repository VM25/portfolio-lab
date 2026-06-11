"use client";

import { useEffect, useState } from "react";

/** True only after the component has mounted on the client. Used to defer
 * Recharts ResponsiveContainer rendering until its parent has a measurable
 * size, which avoids the build-time / first-paint width(-1) height(-1)
 * warning. The fixed-height parent reserves space, so there is no layout
 * shift. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

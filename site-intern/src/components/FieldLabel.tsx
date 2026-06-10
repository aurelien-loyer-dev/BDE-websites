import type { ReactNode } from "react";

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="field-label">{children}</label>;
}

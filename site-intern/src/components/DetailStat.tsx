import type { ReactNode } from "react";

export function DetailStat({ icon, label, value, valueClassName }: { icon: ReactNode; label: string; value: string; valueClassName?: string }) {
  return (
    <div className="detail-stat">
      <span className="detail-stat-icon">{icon}</span>
      <span>
        <span className="detail-stat-label">{label}</span>
        <span className={`detail-stat-value ${valueClassName ?? ""}`.trim()}>{value}</span>
      </span>
    </div>
  );
}

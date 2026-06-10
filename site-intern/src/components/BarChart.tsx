export function BarChart({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  return (
    <div className="bar-chart">
      {entries.map(([label, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={label} className="bar-row">
            <div className="bar-label-row">
              <span className="bar-label-text">{label || "(vide)"}</span>
              <span className="bar-value-label">{count} ({pct}%)</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

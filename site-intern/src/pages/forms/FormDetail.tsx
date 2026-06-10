import { useEffect, useState } from "react";
import type { GFormRecord } from "../../types";
import { Icon } from "../../components/Icon";
import { BarChart } from "../../components/BarChart";

export function FormDetailView({ form, onBack }: { form: GFormRecord | undefined; onBack: () => void }) {
  const [sheetData, setSheetData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!form) return;

    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
    if (!apiKey) {
      setError("Clé API Google manquante (VITE_GOOGLE_API_KEY).");
      setLoading(false);
      return;
    }

    let active = true;

    async function loadSheet() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${form!.spreadsheet_id}/values/A1:Z1000?key=${apiKey}`
        );
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          if (active) setError((json as { error?: { message?: string } })?.error?.message ?? `Erreur HTTP ${res.status}`);
          return;
        }
        const json = await res.json() as { values?: string[][] };
        if (active) setSheetData(json.values ?? []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Erreur réseau.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSheet();
    return () => { active = false; };
  }, [form]);

  if (!form) return null;

  const headers = sheetData[0] ?? [];
  const rows = sheetData.slice(1);

  const columnCounts: Record<number, Record<string, number>> = {};
  for (const row of rows) {
    row.forEach((cell, colIdx) => {
      if (!columnCounts[colIdx]) columnCounts[colIdx] = {};
      const val = cell.trim();
      columnCounts[colIdx][val] = (columnCounts[colIdx][val] ?? 0) + 1;
    });
  }

  return (
    <section className="block">
      <div className="wrap">
        <button className="back-link" type="button" onClick={onBack}>
          <Icon name="back" /> Retour aux formulaires
        </button>

        <div className="section-head" style={{ marginTop: 20 }}>
          <div>
            <div className="eyebrow">Formulaires</div>
            <h2>{form.name}</h2>
          </div>
          {!loading && !error && (
            <span className="muted-text">{rows.length} réponse{rows.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {loading ? (
          <p className="muted-text">Chargement des réponses…</p>
        ) : error ? (
          <div className="form-error">{error}</div>
        ) : sheetData.length === 0 ? (
          <p className="muted-text">Aucune réponse.</p>
        ) : (
          <>
            <div className="page-kicker">Stats</div>
            <div className="stats-grid">
              {headers.map((question, colIdx) => {
                if (question.trim().toLowerCase() === "horodateur") return null;
                const counts = columnCounts[colIdx] ?? {};
                const uniqueCount = Object.keys(counts).length;
                return (
                  <div key={colIdx} className="stat-card">
                    <div className="stat-card-question">{question}</div>
                    {uniqueCount > 15 ? (
                      <p className="stat-card-note">Réponses libres ({uniqueCount} valeurs uniques)</p>
                    ) : (
                      <BarChart counts={counts} />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="page-kicker" style={{ marginTop: 40 }}>Tableau brut</div>
            <div className="data-table-wrap" style={{ marginTop: 12 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {headers.map((h, i) => <th key={i}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}>
                      {headers.map((_, j) => <td key={j} title={row[j] ?? ""}>{row[j] ?? ""}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

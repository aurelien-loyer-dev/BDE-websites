import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { GFormRecord } from "../../types";
import { Icon } from "../../components/Icon";
import { BarChart } from "../../components/BarChart";

export function FormDetailView({ form }: { form: GFormRecord | undefined }) {
  const navigate = useNavigate();
  const [sheetData, setSheetData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [showConfig, setShowConfig] = useState(false);
  const configPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!form) return;
    try {
      const stored = localStorage.getItem(`forms-stats-config-${form.id}`);
      if (stored) setHiddenCols(new Set(JSON.parse(stored) as string[]));
      else setHiddenCols(new Set());
    } catch {
      setHiddenCols(new Set());
    }
  }, [form?.id]);

  useEffect(() => {
    if (!showConfig) return;
    function handleClickOutside(e: MouseEvent) {
      if (configPanelRef.current && !configPanelRef.current.contains(e.target as Node)) {
        setShowConfig(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showConfig]);

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

  const configurableHeaders = headers.filter((h) => h.trim().toLowerCase() !== "horodateur");

  function toggleCol(col: string) {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      try {
        localStorage.setItem(`forms-stats-config-${form!.id}`, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  return (
    <section className="block">
      <div className="wrap">
        <button className="back-link" type="button" onClick={() => navigate("/forms")}>
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div className="page-kicker" style={{ marginBottom: 0 }}>Stats</div>
              <div style={{ position: "relative" }} ref={configPanelRef}>
                <button className="btn btn-small" type="button" onClick={() => setShowConfig((v) => !v)}>
                  Configurer les stats
                </button>
                {showConfig && configurableHeaders.length > 0 && (
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "var(--surface, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 8, padding: "12px 16px", zIndex: 50, minWidth: 220, boxShadow: "0 4px 16px rgba(0,0,0,.1)", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: ".05em", opacity: .6, marginBottom: 4 }}>Colonnes affichées</div>
                    {configurableHeaders.map((col) => (
                      <label key={col} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.9rem" }}>
                        <input
                          type="checkbox"
                          checked={!hiddenCols.has(col)}
                          onChange={() => toggleCol(col)}
                          style={{ cursor: "pointer" }}
                        />
                        {col}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="stats-grid">
              {headers.map((question, colIdx) => {
                if (question.trim().toLowerCase() === "horodateur") return null;
                if (hiddenCols.has(question)) return null;
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

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { EventMappingConfig, EventRecord, GFormRecord } from "../../types";
import { supabase } from "../../lib/supabase";
import { Icon } from "../../components/Icon";
import { FieldLabel } from "../../components/FieldLabel";
import { BarChart } from "../../components/BarChart";

type SignupField = "first_name" | "last_name" | "email" | "cursus";

const FIELD_LABELS: Record<SignupField, string> = {
  first_name: "Prénom",
  last_name: "Nom",
  email: "Email",
  cursus: "Cursus",
};

const SIGNUP_FIELDS: SignupField[] = ["first_name", "last_name", "email", "cursus"];

const AUTO_DETECT: Record<string, SignupField> = {
  "prénom": "first_name",
  "nom": "last_name",
  "email": "email",
  "cursus": "cursus",
};

export function FormDetailView({
  form,
  isAdmin,
  events,
  onFormUpdated,
}: {
  form: GFormRecord | undefined;
  isAdmin: boolean;
  events: EventRecord[];
  onFormUpdated: (form: GFormRecord) => void;
}) {
  const navigate = useNavigate();
  const [sheetData, setSheetData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [showConfig, setShowConfig] = useState(false);
  const configPanelRef = useRef<HTMLDivElement>(null);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [mapping, setMapping] = useState<Record<SignupField, string>>({ first_name: "", last_name: "", email: "", cursus: "" });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; duplicates: number } | null>(null);
  const [importError, setImportError] = useState("");

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

  function openLinkModal() {
    const saved = form?.event_mapping;
    const headers = sheetData[0] ?? [];

    const detected: Record<SignupField, string> = { first_name: "", last_name: "", email: "", cursus: "" };
    for (const header of headers) {
      const key = header.trim().toLowerCase();
      const field = AUTO_DETECT[key];
      if (field && !detected[field]) detected[field] = header;
    }

    setSelectedEventId(saved?.event_id ?? "");
    setMapping({
      first_name: saved?.first_name ?? detected.first_name,
      last_name: saved?.last_name ?? detected.last_name,
      email: saved?.email ?? detected.email,
      cursus: saved?.cursus ?? detected.cursus,
    });
    setImportResult(null);
    setImportError("");
    setShowLinkModal(true);
  }

  async function handleImport() {
    if (!selectedEventId) { setImportError("Veuillez choisir un événement."); return; }
    if (!mapping.email) { setImportError("La colonne Email est requise pour l'import."); return; }
    if (!supabase) { setImportError("Connexion Supabase indisponible."); return; }

    setImporting(true);
    setImportError("");

    const headers = sheetData[0] ?? [];
    const rows = sheetData.slice(1);

    const colIdx = (col: string) => col ? headers.indexOf(col) : -1;
    const idxFirst = colIdx(mapping.first_name);
    const idxLast = colIdx(mapping.last_name);
    const idxEmail = colIdx(mapping.email);
    const idxCursus = colIdx(mapping.cursus);

    const { data: existing } = await supabase
      .from("event_signups")
      .select("email")
      .eq("event_id", selectedEventId);

    const existingEmails = new Set(
      (existing ?? []).map((r: { email: string }) => r.email.trim().toLowerCase())
    );

    const toInsert: Array<{ event_id: string; first_name: string; last_name: string | null; email: string; cursus: string | null }> = [];
    let duplicates = 0;

    for (const row of rows) {
      const email = idxEmail >= 0 ? (row[idxEmail] ?? "").trim() : "";
      if (!email) continue;
      if (existingEmails.has(email.toLowerCase())) { duplicates++; continue; }

      const firstName = idxFirst >= 0 ? (row[idxFirst] ?? "").trim() : "";
      const lastName = idxLast >= 0 ? (row[idxLast] ?? "").trim() || null : null;
      const cursusVal = idxCursus >= 0 ? (row[idxCursus] ?? "").trim() || null : null;

      toInsert.push({
        event_id: selectedEventId,
        first_name: firstName || email,
        last_name: lastName,
        email,
        cursus: cursusVal,
      });
    }

    const mappingConfig: EventMappingConfig = {
      event_id: selectedEventId,
      first_name: mapping.first_name || null,
      last_name: mapping.last_name || null,
      email: mapping.email || null,
      cursus: mapping.cursus || null,
    };

    const { data: updatedForm, error: mappingErr } = await supabase
      .from("forms")
      .update({ event_mapping: mappingConfig })
      .eq("id", form!.id)
      .select("id, name, google_form_url, spreadsheet_id, created_at, event_mapping")
      .single();

    if (mappingErr) { setImportError(mappingErr.message); setImporting(false); return; }
    if (updatedForm) onFormUpdated(updatedForm as GFormRecord);

    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase.from("event_signups").insert(toInsert);
      if (insertErr) { setImportError(insertErr.message); setImporting(false); return; }
    }

    setImportResult({ imported: toInsert.length, duplicates });
    setImporting(false);
  }

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
    <>
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
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {!loading && !error && (
                <span className="muted-text">{rows.length} réponse{rows.length !== 1 ? "s" : ""}</span>
              )}
              {isAdmin && !loading && !error && (
                <button className="btn btn-small" type="button" onClick={openLinkModal}>
                  Relier à un événement
                </button>
              )}
            </div>
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

      {showLinkModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowLinkModal(false); }}>
          <div className="modal-panel">
            <div className="modal-header">
              <h2>Relier à un événement</h2>
              <button className="icon-button" type="button" onClick={() => setShowLinkModal(false)} aria-label="Fermer">
                <Icon name="close" />
              </button>
            </div>

            <div className="modal-fields">
              <div className="field">
                <FieldLabel>Événement</FieldLabel>
                <select className="input" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
                  <option value="">— Choisir un événement —</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title} ({ev.date})</option>
                  ))}
                </select>
              </div>

              <div style={{ fontWeight: 600, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: ".05em", opacity: .6, marginTop: 8 }}>
                Correspondance des colonnes
              </div>

              {SIGNUP_FIELDS.map((field) => (
                <div className="field" key={field}>
                  <FieldLabel>{FIELD_LABELS[field]}{field === "email" ? " *" : ""}</FieldLabel>
                  <select
                    className="input"
                    value={mapping[field]}
                    onChange={(e) => setMapping((prev) => ({ ...prev, [field]: e.target.value }))}
                  >
                    <option value="">— Aucune colonne —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}

              {importError ? <div className="form-error">{importError}</div> : null}

              {importResult ? (
                <div style={{ background: "var(--surface-raised, #f8fafc)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 8, padding: "12px 16px", fontSize: "0.9rem" }}>
                  <strong>{importResult.imported}</strong> inscription{importResult.imported !== 1 ? "s" : ""} importée{importResult.imported !== 1 ? "s" : ""}
                  {importResult.duplicates > 0 ? `, ${importResult.duplicates} doublon${importResult.duplicates !== 1 ? "s" : ""} ignoré${importResult.duplicates !== 1 ? "s" : ""}` : ""}
                  {" "}— configuration sauvegardée.
                </div>
              ) : null}
            </div>

            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="btn" type="button" onClick={() => setShowLinkModal(false)}>Fermer</button>
              <button className="btn btn-primary" type="button" disabled={importing} onClick={handleImport}>
                {importing ? "Import en cours…" : "Importer les inscriptions"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

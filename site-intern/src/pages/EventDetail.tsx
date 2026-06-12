import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { EventRecord, GFormRecord, Registration } from "../types";
import { supabase } from "../lib/supabase";
import { Badge } from "../components/Badge";
import { Icon } from "../components/Icon";
import { DetailStat } from "../components/DetailStat";
import { FieldLabel } from "../components/FieldLabel";
import { formatLongDate, formatDayLabel, formatPrice } from "../lib/formatters";

// ─── Tracking table constants ────────────────────────────────────────────────

const BASE_COLS = [
  { key: "first_name" as const, label: "Prénom" },
  { key: "last_name" as const, label: "Nom" },
  { key: "email" as const, label: "Email" },
];
const BASE_COL_KEYS = new Set(BASE_COLS.map((c) => c.key as string));
// Headers from the sheet to exclude from sheet columns (they map to base cols or are irrelevant)
const BASE_SHEET_NAMES = new Set(["prénom", "nom", "email", "horodateur"]);

function hiddenSheetColsKey(eventId: string) {
  return `tracking-hidden-${eventId}`;
}

function getHiddenSheetCols(eventId: string): string[] {
  try { return JSON.parse(localStorage.getItem(hiddenSheetColsKey(eventId)) ?? "[]") as string[]; }
  catch { return []; }
}

function setHiddenSheetCols(eventId: string, cols: string[]) {
  try { localStorage.setItem(hiddenSheetColsKey(eventId), JSON.stringify(cols)); }
  catch {}
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EventDetailView({
  event,
  onDelete,
  longDateFormatter,
  isAdmin,
  userEmail,
  userId,
  gForms,
}: {
  event: EventRecord | undefined;
  onDelete: (id: string) => void;
  longDateFormatter: Intl.DateTimeFormat;
  isAdmin: boolean;
  userEmail: string;
  userId: string | null;
  gForms: GFormRecord[];
}) {
  const navigate = useNavigate();

  // ── Registrations ──
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loadingReg, setLoadingReg] = useState(false);

  // ── Signup form ──
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cursus, setCursus] = useState("");
  const [regError, setRegError] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regDone, setRegDone] = useState(false);
  const [showRegForm, setShowRegForm] = useState(false);

  // ── Tabs ──
  const [activeTab, setActiveTab] = useState<"detail" | "tracking">("detail");

  // ── Tracking state ──
  // event_tracking overrides: signup_id → col → value
  const [trackingData, setTrackingData] = useState<Record<string, Record<string, string>>>({});
  // event_tracking row ids: `${signup_id}:${col}` → row id
  const [trackingRowIds, setTrackingRowIds] = useState<Record<string, string>>({});
  // Sheet data matched by email: email.toLowerCase() → col → value
  const [sheetData, setSheetData] = useState<Record<string, Record<string, string>>>({});
  // Sheet columns (from the linked form's sheet, excluding base cols)
  const [sheetCols, setSheetCols] = useState<string[]>([]);
  // Manually added columns
  const [customCols, setCustomCols] = useState<string[]>([]);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [trackingLoaded, setTrackingLoaded] = useState(false);
  const [editingCell, setEditingCell] = useState<{ signupId: string; col: string } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().slice(0, 10);
  const isPast = !!event && event.date < today;

  // Reset tracking when event changes
  useEffect(() => {
    setActiveTab("detail");
    setTrackingLoaded(false);
    setTrackingData({});
    setTrackingRowIds({});
    setSheetData({});
    setSheetCols([]);
    setCustomCols([]);
    setEditingCell(null);
  }, [event?.id]);

  // Pre-fill signup form from profile
  useEffect(() => {
    if (!supabase || !userId) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (!data?.full_name) return;
        const parts = (data.full_name as string).trim().split(/\s+/);
        setFirstName(parts[0] ?? "");
        setLastName(parts.slice(1).join(" "));
      });
  }, [userId]);

  // Load signups
  useEffect(() => {
    if (!supabase || !event) return;
    const client = supabase;
    setLoadingReg(true);
    client
      .from("event_signups")
      .select("id, first_name, last_name, email, cursus, created_at")
      .eq("event_id", event.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setRegistrations((data ?? []) as Registration[]);
        setLoadingReg(false);
      });
  }, [event?.id]);

  // Load tracking data (lazy — only when tracking tab is first opened)
  useEffect(() => {
    if (activeTab !== "tracking" || trackingLoaded || !event || !supabase) return;

    async function loadTracking() {
      setLoadingTracking(true);

      // 1. Load event_tracking overrides
      const { data: tRows } = await supabase!
        .from("event_tracking")
        .select("id, signup_id, column_name, value")
        .eq("event_id", event!.id);

      const tData: Record<string, Record<string, string>> = {};
      const tIds: Record<string, string> = {};
      for (const row of tRows ?? []) {
        const sid = String(row.signup_id);
        if (!tData[sid]) tData[sid] = {};
        tData[sid][String(row.column_name)] = String(row.value ?? "");
        tIds[`${sid}:${row.column_name}`] = String(row.id);
      }
      setTrackingData(tData);
      setTrackingRowIds(tIds);

      // 2. Load linked form + full sheet data
      const linkedForm = gForms.find((f) => f.event_mapping?.event_id === event!.id);
      let fetchedSheetCols: string[] = [];
      const fetchedSheetData: Record<string, Record<string, string>> = {};

      if (linkedForm) {
        const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
        if (apiKey) {
          try {
            const res = await fetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${linkedForm.spreadsheet_id}/values/A1:Z1000?key=${apiKey}`
            );
            if (res.ok) {
              const json = await res.json() as { values?: string[][] };
              const allRows = json.values ?? [];
              const headers = allRows[0] ?? [];

              // Email column index from event_mapping
              const emailColHeader = linkedForm.event_mapping?.email ?? null;
              const emailColIdx = emailColHeader ? headers.indexOf(emailColHeader) : -1;

              // Sheet cols = all headers except base-equivalent and horodateur
              fetchedSheetCols = headers.filter(
                (h) => !BASE_SHEET_NAMES.has(h.trim().toLowerCase())
              );

              // Build email → { col → value } map from sheet rows
              if (emailColIdx >= 0) {
                for (const row of allRows.slice(1)) {
                  const email = (row[emailColIdx] ?? "").trim().toLowerCase();
                  if (!email || fetchedSheetData[email]) continue; // first match wins
                  const rowData: Record<string, string> = {};
                  headers.forEach((h, i) => { rowData[h] = row[i] ?? ""; });
                  fetchedSheetData[email] = rowData;
                }
              }
            }
          } catch {}
        }
      }

      // 3. Apply hidden sheet cols from localStorage
      const hidden = getHiddenSheetCols(event!.id);
      fetchedSheetCols = fetchedSheetCols.filter((c) => !hidden.includes(c));

      setSheetCols(fetchedSheetCols);
      setSheetData(fetchedSheetData);

      // 4. Derive custom columns: tracking cols not in base and not in sheet cols
      const sheetColSet = new Set(fetchedSheetCols);
      const allTrackedCols = new Set<string>();
      for (const sid of Object.keys(tData)) {
        for (const col of Object.keys(tData[sid])) allTrackedCols.add(col);
      }
      const custom = [...allTrackedCols].filter(
        (c) => !BASE_COL_KEYS.has(c) && !sheetColSet.has(c)
      );
      setCustomCols(custom);

      setTrackingLoaded(true);
      setLoadingTracking(false);
    }

    loadTracking();
  }, [activeTab, trackingLoaded, event?.id, gForms]);

  // Auto-focus editing input
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  // ── Tracking helpers ──────────────────────────────────────────────────────

  function getCellValue(signupId: string, col: string, reg: Registration): string {
    // event_tracking override takes priority
    const tracked = trackingData[signupId]?.[col];
    if (tracked !== undefined) return tracked;
    // Base columns from event_signups
    if (col === "first_name") return reg.first_name;
    if (col === "last_name") return reg.last_name ?? "";
    if (col === "email") return reg.email;
    // Sheet columns matched by email
    return sheetData[reg.email.toLowerCase()]?.[col] ?? "";
  }

  function startEdit(signupId: string, col: string, reg: Registration) {
    setEditingCell({ signupId, col });
    setEditingValue(getCellValue(signupId, col, reg));
  }

  async function commitEdit() {
    if (!editingCell || !supabase) { setEditingCell(null); return; }
    const { signupId, col } = editingCell;
    const value = editingValue;
    const key = `${signupId}:${col}`;
    const existingId = trackingRowIds[key];

    if (existingId) {
      await supabase.from("event_tracking").update({ value }).eq("id", existingId);
    } else {
      const { data } = await supabase
        .from("event_tracking")
        .insert({ event_id: event!.id, signup_id: signupId, column_name: col, value })
        .select("id")
        .single();
      if (data) setTrackingRowIds((prev) => ({ ...prev, [key]: String(data.id) }));
    }

    setTrackingData((prev) => ({
      ...prev,
      [signupId]: { ...(prev[signupId] ?? {}), [col]: value },
    }));
    setEditingCell(null);
  }

  function handleCellKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
    if (e.key === "Escape") setEditingCell(null);
  }

  function addColumn() {
    const name = window.prompt("Nom de la nouvelle colonne :");
    const trimmed = name?.trim();
    if (!trimmed) return;
    if (BASE_COL_KEYS.has(trimmed) || sheetCols.includes(trimmed) || customCols.includes(trimmed)) return;
    setCustomCols((prev) => [...prev, trimmed]);
  }

  async function deleteColumn(col: string, isSheetCol: boolean) {
    if (!supabase) return;
    if (!window.confirm(`Supprimer la colonne "${col}" et toutes ses données ?`)) return;

    await supabase.from("event_tracking").delete().eq("event_id", event!.id).eq("column_name", col);

    if (isSheetCol) {
      // Persist hidden state so col stays gone after reload
      const hidden = getHiddenSheetCols(event!.id);
      if (!hidden.includes(col)) setHiddenSheetCols(event!.id, [...hidden, col]);
      setSheetCols((prev) => prev.filter((c) => c !== col));
    } else {
      setCustomCols((prev) => prev.filter((c) => c !== col));
    }

    setTrackingData((prev) => {
      const next: Record<string, Record<string, string>> = {};
      for (const sid of Object.keys(prev)) {
        const { [col]: _removed, ...rest } = prev[sid];
        next[sid] = rest;
      }
      return next;
    });
    setTrackingRowIds((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (key.endsWith(`:${col}`)) delete next[key];
      }
      return next;
    });
  }

  function exportCSV() {
    const colDefs = [
      ...BASE_COLS.map((c) => ({ key: c.key as string, label: c.label })),
      ...sheetCols.map((c) => ({ key: c, label: c })),
      ...customCols.map((c) => ({ key: c, label: c })),
    ];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const header = colDefs.map((c) => esc(c.label)).join(",");
    const lines = registrations.map((reg) =>
      colDefs.map((c) => esc(getCellValue(reg.id, c.key, reg))).join(",")
    );
    const csv = "﻿" + [header, ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `suivi-${event!.title.replace(/[^a-z0-9]/gi, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Signup form handlers ──────────────────────────────────────────────────

  const isAlreadyRegistered = registrations.some((r) => r.email === userEmail);

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRegError("");
    const trimFirst = firstName.trim();
    if (!trimFirst) { setRegError("Le prénom est requis."); return; }
    if (!supabase) { setRegError("Connexion indisponible."); return; }
    if (registrations.some((r) => r.email === userEmail)) {
      setRegError("Vous êtes déjà inscrit(e) à cet événement.");
      return;
    }
    setRegSubmitting(true);
    const { data, error } = await supabase
      .from("event_signups")
      .insert({
        event_id: event!.id,
        first_name: trimFirst,
        last_name: lastName.trim() || null,
        email: userEmail,
        cursus: cursus.trim() || null,
      })
      .select("id, first_name, last_name, email, cursus, created_at")
      .single();
    if (error) { setRegError(error.message); setRegSubmitting(false); return; }
    setRegistrations((prev) => [...prev, data as Registration]);
    setRegSubmitting(false);
    setRegDone(true);
  }

  async function deleteRegistration(id: string) {
    if (!supabase) return;
    await supabase.from("event_signups").delete().eq("id", id);
    setRegistrations((r) => r.filter((reg) => reg.id !== id));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!event) {
    return (
      <section className="block">
        <div className="wrap">
          <div className="empty-state">L&apos;événement demandé est introuvable.</div>
        </div>
      </section>
    );
  }

  const allTrackingCols = [
    ...BASE_COLS.map((c) => ({ key: c.key as string, label: c.label, deletable: false, isSheetCol: false })),
    ...sheetCols.map((c) => ({ key: c, label: c, deletable: true, isSheetCol: true })),
    ...customCols.map((c) => ({ key: c, label: c, deletable: true, isSheetCol: false })),
  ];

  return (
    <>
      <section className="detail-head">
        <div className="wrap">
          <div className="detail-head-top">
            <button className="back-link" type="button" onClick={() => navigate("/events")}>
              <Icon name="back" /> Retour au planning
            </button>
            {isAdmin ? (
              <div className="detail-head-actions">
                <button className="btn btn-small" type="button" onClick={() => navigate(`/events/${event.id}/edit`)}>
                  <Icon name="edit" /> Modifier
                </button>
                <button className="btn btn-small btn-danger" type="button" onClick={() => { if (window.confirm("Supprimer cet événement ?")) onDelete(event.id); }}>
                  <Icon name="trash" /> Supprimer
                </button>
              </div>
            ) : null}
          </div>

          <div className="detail-meta-row">
            <Badge visibility={event.visibility} />
            {isPast ? (
              <span className="badge badge-muted">
                <span className="badge-dot" />
                Terminé
              </span>
            ) : null}
            <span className="muted-text">{formatDayLabel(event.date, longDateFormatter)} · {event.time || "À définir"}</span>
          </div>

          <h1>{event.title}</h1>
        </div>
      </section>

      {/* Tab bar — admin only */}
      {isAdmin ? (
        <div className="wrap" style={{ paddingTop: 16, paddingBottom: 0 }}>
          <div style={{ display: "flex", borderBottom: "1px solid var(--border, #e2e8f0)" }}>
            {(["detail", "tracking"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "8px 18px",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === tab ? "2px solid var(--accent, #3b82f6)" : "2px solid transparent",
                  cursor: "pointer",
                  fontWeight: activeTab === tab ? 600 : 400,
                  fontSize: "0.95rem",
                  color: activeTab === tab ? "var(--accent, #3b82f6)" : "inherit",
                  marginBottom: -1,
                }}
              >
                {tab === "detail" ? "Détail" : "Tableau de suivi"}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── DETAIL TAB ── */}
      {activeTab === "detail" ? (
        <>
          <section className="wrap detail-grid">
            <div className="prose">
              <h3>À propos</h3>
              <p>{event.description || "Aucune description fournie."}</p>

              <h3>Planning</h3>
              {event.schedule.length > 0 ? (
                <div className="timeline">
                  {event.schedule.map((step, index) => (
                    <div className="timeline-item" key={`${step.time}-${index}`}>
                      <div className="timeline-time">{step.time || "--:--"}</div>
                      <div className="timeline-body">
                        {step.title ? <p className="timeline-title">{step.title}</p> : null}
                        {step.description ? <p className="timeline-desc">{step.description}</p> : null}
                        {!step.title && !step.description ? <p className="timeline-desc">Étape à définir.</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-inline">Planning à compléter.</div>
              )}

              <h3>Activités</h3>
              {event.activities.length > 0 ? (
                <div className="activities-grid">
                  {event.activities.map((activity) => (
                    <span className="activity-chip" key={activity}>{activity}</span>
                  ))}
                </div>
              ) : (
                <div className="empty-inline">Aucune activité renseignée.</div>
              )}
            </div>

            <aside>
              <div className="info-card">
                <DetailStat icon={<Icon name="calendar" />} label="Date" value={formatLongDate(event.date, longDateFormatter)} />
                <DetailStat icon={<Icon name="clock" />} label="Heure" value={event.time || "À définir"} />
                <DetailStat icon={<Icon name="pin" />} label="Lieu" value={event.location || "À définir"} />
                <DetailStat icon={<Icon name="euro" />} label="Tarif d'entrée" value={formatPrice(event.entryPrice)} valueClassName={event.entryPrice === 0 ? "price-free" : ""} />
                {event.extraPrices.length > 0 ? (
                  <div className="extra-prices">
                    {event.extraPrices.map((item, i) => (
                      <div key={i} className="extra-price-row">
                        <span className="extra-price-label">{item.label}</span>
                        <span className="extra-price-amount">{formatPrice(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <DetailStat icon={<Icon name="users" />} label="Places" value={event.places > 0 ? `${event.places} disponibles` : "Non limité"} />
                <DetailStat icon={<Icon name="users" />} label="Inscrits" value={`${registrations.length}`} />
                {loadingReg ? null : isAlreadyRegistered || regDone ? (
                  <div className="empty-inline" style={{ marginTop: 12 }}>Vous êtes inscrit(e).</div>
                ) : showRegForm ? (
                  <form onSubmit={handleRegister} style={{ marginTop: 12 }}>
                    {regError ? <div className="form-error" style={{ marginBottom: 8 }}>{regError}</div> : null}
                    <div className="signup-fields">
                      <div className="field">
                        <FieldLabel>Prénom</FieldLabel>
                        <input className="input" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" />
                      </div>
                      <div className="field">
                        <FieldLabel>Nom</FieldLabel>
                        <input className="input" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" />
                      </div>
                      <div className="field">
                        <FieldLabel>Email</FieldLabel>
                        <input className="input" type="email" value={userEmail} readOnly />
                      </div>
                      <div className="field">
                        <FieldLabel>Cursus <span className="muted-text">(optionnel)</span></FieldLabel>
                        <input className="input" type="text" value={cursus} onChange={(e) => setCursus(e.target.value)} placeholder="Ex. PGE3, BACH2" />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button className="btn btn-primary" type="submit" disabled={regSubmitting}>
                        {regSubmitting ? "Inscription…" : "Confirmer"}
                      </button>
                      <button className="btn" type="button" onClick={() => { setShowRegForm(false); setRegError(""); }}>
                        Annuler
                      </button>
                    </div>
                  </form>
                ) : (
                  <button className="btn btn-primary" type="button" style={{ marginTop: 12, width: "100%" }} onClick={() => setShowRegForm(true)}>
                    S&apos;inscrire
                  </button>
                )}
              </div>
            </aside>
          </section>

          {isAdmin ? (
            <section className="wrap registrations-section">
              <div className="registrations-header">
                <h3>Inscriptions</h3>
                <span className="registrations-count">{registrations.length} inscrit{registrations.length !== 1 ? "s" : ""}</span>
              </div>

              {loadingReg ? (
                <div className="loading-shell">Chargement…</div>
              ) : registrations.length === 0 ? (
                <div className="empty-inline">Aucune inscription pour le moment.</div>
              ) : (
                <div className="registrations-table-wrap">
                  <table className="registrations-table">
                    <thead>
                      <tr>
                        <th>Prénom</th>
                        <th>Nom</th>
                        <th>Email</th>
                        <th>Cursus</th>
                        <th>Inscrit le</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrations.map((reg) => (
                        <tr key={reg.id}>
                          <td>{reg.first_name}</td>
                          <td>{reg.last_name ?? <span className="muted-text">—</span>}</td>
                          <td>{reg.email}</td>
                          <td>{reg.cursus ?? <span className="muted-text">—</span>}</td>
                          <td className="muted-text">{new Date(reg.created_at).toLocaleDateString("fr-FR")}</td>
                          <td>
                            <button
                              className="btn btn-small btn-danger"
                              type="button"
                              onClick={() => { if (window.confirm(`Désinscrire ${reg.first_name} ?`)) deleteRegistration(reg.id); }}
                            >
                              Désinscrire
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}
        </>
      ) : null}

      {/* ── TRACKING TAB ── */}
      {activeTab === "tracking" ? (
        <section className="wrap registrations-section">
          <div className="registrations-header">
            <h3>Tableau de suivi</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-small" type="button" onClick={addColumn}>
                + Ajouter une colonne
              </button>
              <button className="btn btn-small" type="button" onClick={exportCSV}>
                Exporter CSV
              </button>
            </div>
          </div>

          {loadingTracking ? (
            <div className="loading-shell">Chargement…</div>
          ) : registrations.length === 0 ? (
            <div className="empty-inline">Aucune inscription pour le moment.</div>
          ) : (
            <div className="data-table-wrap" style={{ marginTop: 12 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {allTrackingCols.map((col) => (
                      <th key={col.key} style={{ whiteSpace: "nowrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {col.label}
                          {col.deletable ? (
                            <button
                              type="button"
                              onClick={() => deleteColumn(col.key, col.isSheetCol)}
                              title={`Supprimer "${col.label}"`}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, opacity: 0.45, fontSize: "0.75rem" }}
                            >
                              ✕
                            </button>
                          ) : null}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => (
                    <tr key={reg.id}>
                      {allTrackingCols.map((col) => {
                        const isEditing = editingCell?.signupId === reg.id && editingCell?.col === col.key;
                        const displayVal = getCellValue(reg.id, col.key, reg);
                        return (
                          <td
                            key={col.key}
                            style={{ padding: 0, minWidth: 120 }}
                            onClick={() => { if (!isEditing) startEdit(reg.id, col.key, reg); }}
                          >
                            {isEditing ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={handleCellKey}
                                style={{ width: "100%", border: "none", outline: "2px solid var(--accent, #3b82f6)", padding: "6px 10px", background: "var(--surface, #fff)", boxSizing: "border-box", fontSize: "inherit" }}
                              />
                            ) : (
                              <div
                                title="Cliquer pour modifier"
                                style={{ padding: "6px 10px", minHeight: 34, cursor: "text", whiteSpace: "pre-wrap" }}
                              >
                                {displayVal || <span style={{ opacity: 0.3 }}>—</span>}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}

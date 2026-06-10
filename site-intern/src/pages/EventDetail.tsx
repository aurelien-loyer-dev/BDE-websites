import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { EventRecord, Registration } from "../types";
import { supabase } from "../lib/supabase";
import { Badge } from "../components/Badge";
import { Icon } from "../components/Icon";
import { DetailStat } from "../components/DetailStat";
import { FieldLabel } from "../components/FieldLabel";
import { formatLongDate, formatDayLabel, formatPrice } from "../lib/formatters";

export function EventDetailView({
  event,
  onDelete,
  longDateFormatter,
  isAdmin,
  userEmail,
  userId,
}: {
  event: EventRecord | undefined;
  onDelete: (id: string) => void;
  longDateFormatter: Intl.DateTimeFormat;
  isAdmin: boolean;
  userEmail: string;
  userId: string | null;
}) {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loadingReg, setLoadingReg] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cursus, setCursus] = useState("");
  const [regError, setRegError] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regDone, setRegDone] = useState(false);
  const [showRegForm, setShowRegForm] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const isPast = !!event && event.date < today;

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

  if (!event) {
    return (
      <section className="block">
        <div className="wrap">
          <div className="empty-state">L&apos;événement demandé est introuvable.</div>
        </div>
      </section>
    );
  }

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
                    <input className="input" type="text" value={cursus} onChange={(e) => setCursus(e.target.value)} placeholder="Ex. B1 Informatique" />
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
  );
}

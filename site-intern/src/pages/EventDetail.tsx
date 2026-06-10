import { useEffect, useState } from "react";
import type { EventRecord, Registration } from "../types";
import { supabase } from "../lib/supabase";
import { Badge } from "../components/Badge";
import { Icon } from "../components/Icon";
import { DetailStat } from "../components/DetailStat";
import { formatLongDate, formatDayLabel, formatPrice } from "../lib/formatters";

export function EventDetailView({
  event,
  onBack,
  onEdit,
  onDelete,
  longDateFormatter,
}: {
  event: EventRecord | undefined;
  onBack: () => void;
  onEdit: (event: EventRecord) => void;
  onDelete: (id: string) => void;
  longDateFormatter: Intl.DateTimeFormat;
}) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loadingReg, setLoadingReg] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const isPast = !!event && event.date < today;

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
            <button className="back-link" type="button" onClick={onBack}>
              <Icon name="back" /> Retour au planning
            </button>
            <div className="detail-head-actions">
              <button className="btn btn-small" type="button" onClick={() => onEdit(event)}>
                <Icon name="edit" /> Modifier
              </button>
              <button className="btn btn-small btn-danger" type="button" onClick={() => { if (window.confirm("Supprimer cet événement ?")) onDelete(event.id); }}>
                <Icon name="trash" /> Supprimer
              </button>
            </div>
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
          </div>
        </aside>
      </section>

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
                        onClick={() => { if (window.confirm(`Supprimer l'inscription de ${reg.first_name} ?`)) deleteRegistration(reg.id); }}
                      >
                        <Icon name="trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

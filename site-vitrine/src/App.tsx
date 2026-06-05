import { type FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import logoBDE from "./public/logoBDE.jpg";

type View = "home" | "planning" | "detail";

type PriceItem = { label: string; amount: number };
type ScheduleItem = { time: string; title: string; description: string };
type EventRecord = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  entryPrice: number;
  extraPrices: PriceItem[];
  places: number;
  visibility: "public" | "prive";
  schedule: ScheduleItem[];
  activities: string[];
};

// ─── Formatters ───────────────────────────────────────────────

const shortDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const longDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatShortDate(date: string): string {
  return shortDateFormatter.format(new Date(`${date}T00:00:00`));
}

function formatLongDate(date: string): string {
  return longDateFormatter.format(new Date(`${date}T00:00:00`));
}

function formatPrice(value: number): string {
  return value === 0 ? "Gratuit" : `${value.toFixed(0)} €`;
}

// ─── Icons ────────────────────────────────────────────────────

type IconName = "calendar" | "clock" | "pin" | "users" | "euro" | "back" | "arrow-right";

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4.5" width="18" height="16" rx="2" />
          <path d="M3 9h18" />
          <path d="M8 2.5v4" />
          <path d="M16 2.5v4" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="2.6" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 19v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V19" />
          <circle cx="9" cy="7" r="3.2" />
          <path d="M22 19v-1.5a4 4 0 0 0-3-3.85" />
          <path d="M16 3.65a4 4 0 0 1 0 7.7" />
        </svg>
      );
    case "euro":
      return (
        <svg {...common}>
          <path d="M17 5.5A7 7 0 1 0 17 18.5" />
          <path d="M4 10h9" />
          <path d="M4 14h7" />
        </svg>
      );
    case "back":
      return (
        <svg {...common}>
          <path d="M14 6l-6 6 6 6" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      );
    default:
      return null;
  }
}

// ─── Components ───────────────────────────────────────────────

function DetailStat({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
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

function EventCard({
  event,
  onOpenEvent,
}: {
  event: EventRecord;
  onOpenEvent: (id: string) => void;
}) {
  const priceLabel = formatPrice(event.entryPrice);
  const isFree = event.entryPrice === 0;

  return (
    <button className="event-card" type="button" onClick={() => onOpenEvent(event.id)}>
      <div className="card-top">
        <span className="card-date">{formatShortDate(event.date)}</span>
      </div>

      <h3>{event.title}</h3>

      <div className="card-meta">
        <div className="meta-row">
          <Icon name="pin" />
          <span>{event.location || "Lieu à confirmer"}</span>
        </div>
        <div className="meta-row">
          <Icon name="clock" />
          <span>{event.time || "À définir"}</span>
        </div>
        <div className="meta-row">
          <Icon name="euro" />
          <span className={isFree ? "card-price-free" : "card-price"}>{priceLabel}</span>
        </div>
      </div>
    </button>
  );
}

function Navbar({
  view,
  onNavigate,
}: {
  view: View;
  onNavigate: (next: View) => void;
}) {
  const items: Array<{ id: View; label: string }> = [
    { id: "home", label: "Accueil" },
    { id: "planning", label: "Planning" },
  ];

  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <button className="brand-button" type="button" onClick={() => onNavigate("home")}>
          <img src={logoBDE} className="brand-mark" alt="Logo BDE" />
          <span className="brand-name">BDE Epitech Réunion</span>
        </button>

        <nav className="nav-links" aria-label="Navigation principale">
          {items.map((item) => (
            <button
              key={item.id}
              className={`nav-link ${view === item.id || (view === "detail" && item.id === "planning") ? "active" : ""}`}
              type="button"
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

function HomeView({
  events,
  loading,
  onNavigate,
  onOpenEvent,
}: {
  events: EventRecord[];
  loading: boolean;
  onNavigate: (next: View) => void;
  onOpenEvent: (id: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(
    () => events.filter((e) => e.date >= today).slice(0, 3),
    [events, today],
  );

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="wrap">
          <div className="hero-tag">
            <span className="hero-tag-dot" aria-hidden="true" />
            Bureau Des Étudiants · Epitech Réunion
          </div>
          <h1>Les événements du BDE</h1>
          <p className="hero-subtitle">
            Retrouvez tous nos événements publics, le planning et les détails de chaque rendez-vous.
          </p>
          <div className="hero-actions">
            <button
              className="btn btn-primary btn-lg"
              type="button"
              onClick={() => onNavigate("planning")}
            >
              Voir le planning <Icon name="arrow-right" />
            </button>
          </div>
        </div>
      </section>

      {/* Prochains événements */}
      <section className="block">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">À venir</div>
              <h2>Prochains événements</h2>
            </div>
            {events.length > 3 ? (
              <button className="btn" type="button" onClick={() => onNavigate("planning")}>
                Tout voir <Icon name="arrow-right" />
              </button>
            ) : null}
          </div>

          {loading ? (
            <div className="loading-shell">Chargement des événements…</div>
          ) : upcoming.length > 0 ? (
            <div className="list-grid">
              {upcoming.map((event) => (
                <EventCard key={event.id} event={event} onOpenEvent={onOpenEvent} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-state-title">Aucun événement prévu</p>
              <p className="empty-state-sub">Revenez bientôt, de nouveaux événements seront annoncés.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function PlanningView({
  events,
  loading,
  onOpenEvent,
}: {
  events: EventRecord[];
  loading: boolean;
  onOpenEvent: (id: string) => void;
}) {
  return (
    <section className="block">
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow">Agenda</div>
            <h2>Planning des événements</h2>
          </div>
        </div>

        {loading ? (
          <div className="loading-shell">Chargement des événements…</div>
        ) : events.length > 0 ? (
          <div className="list-grid">
            {events.map((event) => (
              <EventCard key={event.id} event={event} onOpenEvent={onOpenEvent} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-state-title">Aucun événement public</p>
            <p className="empty-state-sub">Aucun événement n&apos;est disponible pour le moment.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function EventDetailView({
  event,
  onBack,
}: {
  event: EventRecord | undefined;
  onBack: () => void;
}) {
  const [showRegister, setShowRegister] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [regForm, setRegForm] = useState({ firstName: "", lastName: "", email: "", cursus: "" });

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!regForm.firstName.trim() || !regForm.email.trim()) {
      setRegisterError("Prénom et email requis.");
      return;
    }
    if (!supabase || !event) return;
    setRegistering(true);
    setRegisterError("");

    const { error } = await supabase.from("event_signups").insert({
      event_id: event.id,
      first_name: regForm.firstName.trim(),
      last_name: regForm.lastName.trim(),
      email: regForm.email.trim().toLowerCase(),
      cursus: regForm.cursus.trim() || null,
    });

    if (error) {
      if (error.code === "23505") {
        setRegisterError("Tu es déjà inscrit(e) à cet événement.");
      } else {
        setRegisterError("Une erreur est survenue. Réessaie.");
      }
      setRegistering(false);
      return;
    }

    setRegistered(true);
    setRegistering(false);
  }

  if (!event) {
    return (
      <section className="block">
        <div className="wrap">
          <button className="back-link" type="button" onClick={onBack}>
            <Icon name="back" /> Retour au planning
          </button>
          <div className="empty-state" style={{ marginTop: 24 }}>
            L&apos;événement demandé est introuvable.
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="detail-head">
        <div className="wrap">
          <button className="back-link" type="button" onClick={onBack}>
            <Icon name="back" /> Retour au planning
          </button>

          <div className="detail-meta-row">
            <span className="muted-text">
              {formatLongDate(event.date)}{event.time ? ` · ${event.time}` : ""}
            </span>
          </div>

          <h1>{event.title}</h1>
        </div>
      </section>

      <div className="detail-grid">
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
                    {!step.title && !step.description ? (
                      <p className="timeline-desc">Étape à définir.</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-inline">Planning à venir.</div>
          )}

          <h3>Activités</h3>
          {event.activities.length > 0 ? (
            <div className="activities-grid">
              {event.activities.map((activity) => (
                <span className="activity-chip" key={activity}>
                  {activity}
                </span>
              ))}
            </div>
          ) : (
            <div className="empty-inline">Aucune activité renseignée.</div>
          )}
        </div>

        <aside>
          <div className="info-card">
            <DetailStat
              icon={<Icon name="calendar" />}
              label="Date"
              value={formatLongDate(event.date)}
            />
            <DetailStat
              icon={<Icon name="clock" />}
              label="Heure"
              value={event.time || "À définir"}
            />
            <DetailStat
              icon={<Icon name="pin" />}
              label="Lieu"
              value={event.location || "À définir"}
            />
            <DetailStat
              icon={<Icon name="euro" />}
              label="Tarif d'entrée"
              value={formatPrice(event.entryPrice)}
              valueClassName={event.entryPrice === 0 ? "price-free" : ""}
            />
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
            <DetailStat
              icon={<Icon name="users" />}
              label="Places"
              value={event.places > 0 ? `${event.places} disponibles` : "Non limité"}
            />

            {registered ? (
              <div className="register-success">
                <div className="register-success-check">✓</div>
                <div>
                  <div className="register-success-title">Inscription confirmée !</div>
                  <div className="register-success-sub">À bientôt à l&apos;événement !</div>
                </div>
              </div>
            ) : showRegister ? (
              <form className="register-form" onSubmit={handleRegister}>
                {registerError ? <div className="form-error">{registerError}</div> : null}
                <div className="field-row">
                  <div className="field">
                    <label className="field-label">Prénom <span className="req">*</span></label>
                    <input className="input" value={regForm.firstName} onChange={(e) => setRegForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="Prénom" />
                  </div>
                  <div className="field">
                    <label className="field-label">Nom <span className="req">*</span></label>
                    <input className="input" value={regForm.lastName} onChange={(e) => setRegForm((f) => ({ ...f, lastName: e.target.value }))} placeholder="Nom" />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Email <span className="req">*</span></label>
                  <input className="input" type="email" value={regForm.email} onChange={(e) => setRegForm((f) => ({ ...f, email: e.target.value }))} placeholder="prenom.nom@epitech.eu" />
                </div>
                <div className="field">
                  <label className="field-label">Cursus</label>
                  <input className="input" value={regForm.cursus} onChange={(e) => setRegForm((f) => ({ ...f, cursus: e.target.value }))} placeholder="Ex : Bachelor 2, MSC 1…" />
                </div>
                <button className="btn btn-primary btn-full" type="submit" disabled={registering}>
                  {registering ? "Inscription..." : "Confirmer l'inscription"}
                </button>
                <button className="btn btn-full" type="button" onClick={() => setShowRegister(false)} style={{ marginTop: 8 }}>
                  Annuler
                </button>
              </form>
            ) : (
              <>
                <button className="btn btn-primary btn-full detail-cta" type="button" onClick={() => setShowRegister(true)}>
                  S&apos;inscrire
                </button>
                <p className="detail-note">Les inscriptions sont ouvertes.</p>
              </>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

// ─── App ──────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>("home");
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const client = supabase;
    let active = true;

    async function loadEvents() {
      const { data } = await client
        .from("events")
        .select(
          "id, title, date, time, location, description, price, extra_prices, places, visibility, schedule, activities",
        )
        .eq("visibility", "public")
        .order("date", { ascending: true });

      if (!active) return;

      setEvents(
        (data ?? []).map((row) => ({
          id: String(row.id),
          title: row.title ?? "Sans titre",
          date: row.date ?? "",
          time: row.time ?? "",
          location: row.location ?? "",
          description: row.description ?? "",
          entryPrice: Number(row.price ?? 0),
          extraPrices: Array.isArray(row.extra_prices)
            ? (row.extra_prices as PriceItem[])
            : [],
          places: Number(row.places ?? 0),
          visibility: (row.visibility ?? "public") as "public" | "prive",
          schedule: Array.isArray(row.schedule)
            ? (row.schedule as ScheduleItem[])
            : [],
          activities: Array.isArray(row.activities)
            ? (row.activities as string[])
            : [],
        })),
      );
      setLoading(false);
    }

    loadEvents();

    return () => {
      active = false;
    };
  }, []);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId),
    [events, selectedEventId],
  );

  function navigate(nextView: View) {
    setView(nextView);
    if (nextView !== "detail") {
      setSelectedEventId(null);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEvent(id: string) {
    setSelectedEventId(id);
    setView("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="app-shell">
      <Navbar view={view} onNavigate={navigate} />

      {view === "home" ? (
        <HomeView
          events={events}
          loading={loading}
          onNavigate={navigate}
          onOpenEvent={openEvent}
        />
      ) : null}

      {view === "planning" ? (
        <PlanningView events={events} loading={loading} onOpenEvent={openEvent} />
      ) : null}

      {view === "detail" ? (
        <EventDetailView event={selectedEvent} onBack={() => navigate("planning")} />
      ) : null}

      <footer className="footer wrap">
        <span>BDE Epitech Réunion</span>
        <span>{events.length} événement(s)</span>
      </footer>
    </div>
  );
}

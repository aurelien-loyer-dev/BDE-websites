import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
import logoBDE from "./public/logoBDE.jpg";

type View = "home" | "planning" | "detail" | "create";
type Visibility = "public" | "prive";

type PriceItem = {
  label: string;
  amount: number;
};

type ScheduleItem = {
  time: string;
  title: string;
  description: string;
};

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
  visibility: Visibility;
  schedule: ScheduleItem[];
  activities: string[];
};

type Registration = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  cursus: string | null;
  created_at: string;
};

type FormState = {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  entryPrice: string;
  places: string;
  visibility: Visibility;
};

const allowedEmails = (import.meta.env.VITE_ALLOWED_EMAILS as string | undefined)
  ?.split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean) ?? [];

const emptyForm: FormState = {
  title: "",
  date: "",
  time: "",
  location: "",
  description: "",
  entryPrice: "0",
  places: "",
  visibility: "public",
};

function useFormatters() {
  const dateTime = useMemo(
    () => ({
      shortDate: new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }),
      longDate: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
    }),
    [],
  );

  return dateTime;
}

function formatDayLabel(date: string, formatter: Intl.DateTimeFormat) {
  return formatter.format(new Date(`${date}T00:00:00`));
}

function formatLongDate(date: string, formatter: Intl.DateTimeFormat) {
  return formatter.format(new Date(`${date}T00:00:00`));
}

function formatPrice(value: number) {
  return value === 0 ? "Gratuit" : `${value.toFixed(0)} €`;
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return String(Date.now());
}

function Icon({ name }: { name: "calendar" | "clock" | "pin" | "users" | "euro" | "back" | "plus" | "trash" | "close" | "edit" }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
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
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M9 7V5h6v2" />
          <path d="M6 7l1 13h10l1-13" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </svg>
      );
    case "edit":
      return (
        <svg {...common}>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
        </svg>
      );
    default:
      return null;
  }
}

function Badge({ visibility }: { visibility: Visibility }) {
  const isPublic = visibility === "public";

  return (
    <span className={`badge ${isPublic ? "badge-public" : "badge-private"}`}>
      <span className="badge-dot" />
      {isPublic ? "Public" : "Privé"}
    </span>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="field-label">{children}</label>;
}

function DetailStat({ icon, label, value, valueClassName }: { icon: ReactNode; label: string; value: string; valueClassName?: string }) {
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
  onOpen,
  shortDateFormatter,
  past,
}: {
  event: EventRecord;
  onOpen: () => void;
  shortDateFormatter: Intl.DateTimeFormat;
  past?: boolean;
}) {
  return (
    <button className={`event-card${past ? " event-card-past" : ""}`} type="button" onClick={onOpen}>
      <div className="card-top">
        <span className="card-date">{formatDayLabel(event.date, shortDateFormatter)}</span>
        <div className="card-top-badges">
          {past ? (
            <span className="badge badge-muted">
              <span className="badge-dot" />
              Terminé
            </span>
          ) : null}
          <Badge visibility={event.visibility} />
        </div>
      </div>

      <h3>{event.title}</h3>

      <div className="card-meta">
        <div className="meta-row">
          <Icon name="pin" />
          <span>{event.location}</span>
        </div>
        <div className="meta-row">
          <Icon name="clock" />
          <span>
            {event.time || "À définir"} · {formatPrice(event.entryPrice)}
          </span>
        </div>
        <div className="meta-row">
          <Icon name="users" />
          <span className="spots">{event.places > 0 ? `${event.places} places` : "Places libres"}</span>
        </div>
      </div>
    </button>
  );
}

function AuthScreen({
  onAuthenticate,
  error,
  isLoading,
}: {
  onAuthenticate: (email: string, password: string) => Promise<void>;
  error: string;
  isLoading: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onAuthenticate(email, password);
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand-row">
          <img src={logoBDE} className="brand-mark" alt="Logo BDE" />
          <div>
            <div className="brand-name">BDE Epitech Réunion</div>
            <div className="brand-subtitle">Accès interne réservé aux membres autorisés</div>
          </div>
        </div>

        <h1>Connexion</h1>

        {error ? <div className="form-error">{error}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <FieldLabel>Email</FieldLabel>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="prenom.nom@epitech.eu"
              autoComplete="email"
            />
          </div>

          <div className="field">
            <FieldLabel>Mot de passe</FieldLabel>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={isLoading}>
            {isLoading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </section>
    </main>
  );
}

function readHashParams(): URLSearchParams {
  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

type InviteSessionStatus = "checking" | "ready" | "error";

function SetPasswordScreen() {
  const [sessionStatus, setSessionStatus] = useState<InviteSessionStatus>("checking");
  const [sessionError, setSessionError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = readHashParams();

    if (params.has("error") || params.has("error_code")) {
      setSessionError(
        params.get("error_code") === "otp_expired"
          ? "Ce lien d'invitation a expiré. Demande un nouveau lien au bureau du BDE."
          : "Ce lien d'invitation n'est plus valable. Demande un nouveau lien au bureau du BDE.",
      );
      setSessionStatus("error");
      return;
    }

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setSessionError("Lien d'invitation incomplet ou invalide.");
      setSessionStatus("error");
      return;
    }

    if (!supabase) {
      setSessionError("Connexion à Supabase indisponible.");
      setSessionStatus("error");
      return;
    }

    let active = true;
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error: setSessionErr }) => {
      if (!active) return;
      if (setSessionErr) {
        setSessionError("Ce lien d'invitation a expiré. Demande un nouveau lien au bureau du BDE.");
        setSessionStatus("error");
        return;
      }
      setSessionStatus("ready");
    });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.trim().length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (!supabase) {
      setError("Connexion à Supabase indisponible.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    setDone(true);
    setSubmitting(false);
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand-row">
          <img src={logoBDE} className="brand-mark" alt="Logo BDE" />
          <div>
            <div className="brand-name">BDE Epitech Réunion</div>
            <div className="brand-subtitle">Activation du compte</div>
          </div>
        </div>

        {sessionStatus === "checking" ? (
          <p>Vérification du lien d&apos;invitation...</p>
        ) : sessionStatus === "error" ? (
          <>
            <h1>Lien invalide</h1>
            <p>{sessionError}</p>
          </>
        ) : (
          <>
            <h1>Définir votre mot de passe</h1>

            {done ? (
              <p>Mot de passe défini avec succès. Vous pouvez maintenant vous connecter.</p>
            ) : (
              <>
                <p>Choisissez un mot de passe pour activer votre accès à l&apos;espace membres.</p>

                {error ? <div className="form-error">{error}</div> : null}

                <form onSubmit={handleSubmit}>
                  <div className="field">
                    <FieldLabel>Nouveau mot de passe</FieldLabel>
                    <input
                      className="input"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="field">
                    <FieldLabel>Confirmer le mot de passe</FieldLabel>
                    <input
                      className="input"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>

                  <button className="btn btn-primary btn-full" type="submit" disabled={submitting}>
                    {submitting ? "Validation..." : "Définir le mot de passe"}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function Navbar({ view, onNavigate, onLogout }: { view: View; onNavigate: (next: View) => void; onLogout: () => void }) {
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
            <button key={item.id} className={`nav-link ${view === item.id ? "active" : ""}`} type="button" onClick={() => onNavigate(item.id)}>
              {item.label}
            </button>
          ))}
          <button className="nav-link" type="button" onClick={onLogout}>Déconnexion</button>
        </nav>
      </div>
    </header>
  );
}

function HomeView({ onNavigate }: { onNavigate: (next: View) => void }) {
  return (
    <section className="block">
      <div className="wrap">
        <div className="eyebrow">Tools</div>
        <div className="tools-grid">
          <button className="tool-card" type="button" onClick={() => onNavigate("create")}>
            <span className="tool-card-icon"><Icon name="plus" /></span>
            <span className="tool-card-label">Créer un événement</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function PlanningView({ events, filter, onFilterChange, onOpenEvent, shortDateFormatter }: { events: EventRecord[]; filter: "all" | Visibility; onFilterChange: (next: "all" | Visibility) => void; onOpenEvent: (id: string) => void; shortDateFormatter: Intl.DateTimeFormat; }) {
  const filters: Array<{ id: "all" | Visibility; label: string }> = [
    { id: "all", label: "Tous" },
    { id: "public", label: "Public" },
    { id: "prive", label: "Privé" },
  ];

  const shownEvents = events.filter((event) => filter === "all" || event.visibility === filter);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = shownEvents.filter((event) => event.date >= today);
  const past = shownEvents.filter((event) => event.date < today).slice().reverse();

  return (
    <section className="block">
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow">Agenda du BDE</div>
            <h2>Planning des événements</h2>
          </div>

          <div className="filters" role="tablist" aria-label="Filtres d'événements">
            {filters.map((item) => (
              <button
                key={item.id}
                className={`pill ${filter === item.id ? "active" : ""}`}
                type="button"
                onClick={() => onFilterChange(item.id)}
                aria-pressed={filter === item.id}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {shownEvents.length > 0 ? (
          <>
            <h3 className="planning-group-title">À venir</h3>
            {upcoming.length > 0 ? (
              <div className="list-grid">
                {upcoming.map((event) => (
                  <EventCard key={event.id} event={event} shortDateFormatter={shortDateFormatter} onOpen={() => onOpenEvent(event.id)} />
                ))}
              </div>
            ) : (
              <div className="empty-inline">Aucun événement à venir.</div>
            )}

            {past.length > 0 ? (
              <>
                <h3 className="planning-group-title planning-group-title-past">Passés</h3>
                <div className="list-grid">
                  {past.map((event) => (
                    <EventCard key={event.id} event={event} shortDateFormatter={shortDateFormatter} onOpen={() => onOpenEvent(event.id)} past />
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : (
          <div className="empty-state">Aucun événement pour le moment.</div>
        )}
      </div>
    </section>
  );
}

function EventDetailView({ event, onBack, onEdit, onDelete, longDateFormatter }: { event: EventRecord | undefined; onBack: () => void; onEdit: (event: EventRecord) => void; onDelete: (id: string) => void; longDateFormatter: Intl.DateTimeFormat; }) {
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

function CreateEventView({
  onCreate,
  onUpdate,
  onCancel,
  saving,
  existingEvent,
}: {
  onCreate?: (event: EventRecord) => Promise<void>;
  onUpdate?: (event: EventRecord) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  existingEvent?: EventRecord;
}) {
  const isEditing = Boolean(existingEvent);

  const [form, setForm] = useState<FormState>(() =>
    existingEvent ? {
      title: existingEvent.title,
      date: existingEvent.date,
      time: existingEvent.time,
      location: existingEvent.location,
      description: existingEvent.description,
      entryPrice: String(existingEvent.entryPrice),
      places: existingEvent.places > 0 ? String(existingEvent.places) : "",
      visibility: existingEvent.visibility,
    } : emptyForm,
  );
  const [schedule, setSchedule] = useState<ScheduleItem[]>(
    existingEvent?.schedule.length ? existingEvent.schedule : [{ time: "", title: "", description: "" }],
  );
  const [extraPrices, setExtraPrices] = useState<PriceItem[]>(existingEvent?.extraPrices ?? []);
  const [activities, setActivities] = useState<string[]>(existingEvent?.activities ?? []);
  const [activityInput, setActivityInput] = useState("");
  const [error, setError] = useState("");

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateSchedule(index: number, key: keyof ScheduleItem, value: string) {
    setSchedule((current) => current.map((step, stepIndex) => (stepIndex === index ? { ...step, [key]: value } : step)));
  }

  function addScheduleStep() {
    setSchedule((current) => [...current, { time: "", title: "", description: "" }]);
  }

  function addExtraPrice() {
    setExtraPrices((current) => [...current, { label: "", amount: 0 }]);
  }

  function updateExtraPrice(index: number, key: keyof PriceItem, value: string) {
    setExtraPrices((current) =>
      current.map((item, i) => i === index ? { ...item, [key]: key === "amount" ? Number(value) || 0 : value } : item),
    );
  }

  function removeExtraPrice(index: number) {
    setExtraPrices((current) => current.filter((_, i) => i !== index));
  }

  function removeScheduleStep(index: number) {
    setSchedule((current) => current.filter((_, stepIndex) => stepIndex !== index));
  }

  function addActivity() {
    const value = activityInput.trim();

    if (!value || activities.includes(value)) {
      setActivityInput("");
      return;
    }

    setActivities((current) => [...current, value]);
    setActivityInput("");
  }

  function removeActivity(value: string) {
    setActivities((current) => current.filter((a) => a !== value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Le titre est obligatoire.");
      return;
    }

    if (!form.date) {
      setError("La date est obligatoire.");
      return;
    }

    const places = form.places ? Number(form.places) : 0;

    const eventData: EventRecord = {
      id: existingEvent?.id ?? createId(),
      title: form.title.trim(),
      date: form.date,
      time: form.time.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      entryPrice: Number(form.entryPrice) || 0,
      extraPrices,
      places,
      visibility: form.visibility,
      schedule: schedule.filter((step) => step.time.trim() || step.title.trim() || step.description.trim()),
      activities,
    };

    setError("");
    if (isEditing && onUpdate) {
      await onUpdate(eventData);
    } else if (onCreate) {
      await onCreate(eventData);
    }
  }

  return (
    <section className="wrap form-shell">
      <button className="back-link" type="button" onClick={onCancel}>
        <Icon name="back" /> Annuler
      </button>

      <div className="page-kicker">{isEditing ? "Modifier" : "Nouvel événement"}</div>
      <h2>{isEditing ? "Modifier l'événement" : "Créer un événement"}</h2>

      {error ? <div className="form-error">{error}</div> : null}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <FieldLabel>Titre <span className="req">*</span></FieldLabel>
          <input
            className="input"
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="Ex : Soirée d'intégration"
          />
        </div>

        <div className="field-row-3">
          <div className="field">
            <FieldLabel>Date <span className="req">*</span></FieldLabel>
            <input className="input" type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} />
          </div>

          <div className="field">
            <FieldLabel>Heure</FieldLabel>
            <input className="input" type="time" value={form.time} onChange={(event) => updateField("time", event.target.value)} />
          </div>

          <div className="field">
            <FieldLabel>Places</FieldLabel>
            <input className="input" type="number" min="0" value={form.places} onChange={(event) => updateField("places", event.target.value)} placeholder="Illimité" />
          </div>
        </div>

        <div className="field">
          <FieldLabel>Lieu</FieldLabel>
          <input className="input" value={form.location} onChange={(event) => updateField("location", event.target.value)} placeholder="Campus Epitech, Saint-André" />
        </div>

        <div className="field">
          <FieldLabel>Description</FieldLabel>
          <textarea
            className="textarea"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Présentez l'événement en quelques lignes…"
          />
        </div>

        <div className="field-row">
          <div className="field">
            <FieldLabel>Tarif d'entrée (€)</FieldLabel>
            <input className="input" type="number" min="0" value={form.entryPrice} onChange={(event) => updateField("entryPrice", event.target.value)} />
            <div className="field-hint">Mettez 0 pour un événement gratuit.</div>
          </div>

          <div className="field">
            <FieldLabel>Visibilité</FieldLabel>
            <div className="segmented-control" role="group" aria-label="Visibilité de l'événement">
              <button className={`segmented-option ${form.visibility === "public" ? "active" : ""}`} type="button" onClick={() => updateField("visibility", "public")}>
                <span className="segmented-title">Public</span>
                <span className="segmented-desc">Ouvert à tous</span>
              </button>
              <button className={`segmented-option ${form.visibility === "prive" ? "active" : ""}`} type="button" onClick={() => updateField("visibility", "prive")}>
                <span className="segmented-title">Privé</span>
                <span className="segmented-desc">Membres BDE</span>
              </button>
            </div>
          </div>
        </div>

        <fieldset className="fieldset">
          <legend>Tarifs supplémentaires</legend>
          <p>Billetterie, boissons, goodies…</p>

          {extraPrices.map((item, index) => (
            <div className="price-row" key={index}>
              <input className="input" placeholder="Label (ex : T-shirt BDE)" value={item.label} onChange={(e) => updateExtraPrice(index, "label", e.target.value)} />
              <div className="price-amount-wrap">
                <input className="input" type="number" min="0" placeholder="0" value={item.amount || ""} onChange={(e) => updateExtraPrice(index, "amount", e.target.value)} />
                <span className="price-currency">€</span>
              </div>
              <button className="icon-button" type="button" onClick={() => removeExtraPrice(index)} aria-label="Supprimer">
                <Icon name="trash" />
              </button>
            </div>
          ))}

          <button className="btn btn-small" type="button" onClick={addExtraPrice}>
            <Icon name="plus" /> Ajouter un tarif
          </button>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Planning</legend>
          <p>Construisez le déroulé de votre événement, étape par étape.</p>

          {schedule.map((step, index) => (
            <div className="schedule-card" key={index}>
              <div className="schedule-card-header">
                <input className="input schedule-time-input" placeholder="00:00" value={step.time} onChange={(event) => updateSchedule(index, "time", event.target.value)} />
                <input className="input" placeholder="Titre de l'étape (ex : Accueil)" value={step.title} onChange={(event) => updateSchedule(index, "title", event.target.value)} />
                <button className="icon-button" type="button" onClick={() => removeScheduleStep(index)} disabled={schedule.length === 1} aria-label="Supprimer">
                  <Icon name="trash" />
                </button>
              </div>
              <textarea className="textarea schedule-desc-textarea" placeholder="Détails optionnels…" value={step.description} onChange={(event) => updateSchedule(index, "description", event.target.value)} />
            </div>
          ))}

          <button className="btn btn-small" type="button" onClick={addScheduleStep}>
            <Icon name="plus" /> Ajouter une étape
          </button>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Activités prévues</legend>
          <p>Ajoutez des mots-clés pour décrire ce qui est prévu.</p>

          <div className="tag-input-row">
            <input className="input" placeholder="Ex : Blind test" value={activityInput} onChange={(event) => setActivityInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addActivity(); } }} />
            <button className="btn" type="button" onClick={addActivity}>
              <Icon name="plus" /> Ajouter
            </button>
          </div>

          {activities.length > 0 ? (
            <div className="tags tag-list">
              {activities.map((activity, index) => (
                <span className="tag-removable" key={activity}>
                  {activity}
                  <button type="button" onClick={() => removeActivity(activity)} aria-label={`Retirer ${activity}`}>
                    <Icon name="close" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </fieldset>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Publier l'événement"}
          </button>
          <button className="btn" type="button" onClick={onCancel}>
            Annuler
          </button>
        </div>
      </form>
    </section>
  );
}

export default function App() {
  const [isInviteFlow] = useState(() => {
    const params = readHashParams();
    return params.get("type") === "invite" || params.has("error") || params.has("error_code");
  });
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authLoading, setAuthLoading] = useState(hasSupabaseConfig);
  const [authError, setAuthError] = useState("");
  const [view, setView] = useState<View>("home");
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Visibility>("all");
  const [eventsError, setEventsError] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null);
  const formatters = useFormatters();

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    const client = supabase;

    let active = true;

    async function loadSession() {
      const { data, error } = await client.auth.getSession();

      if (!active) {
        return;
      }

      if (error) {
        setAuthError(error.message);
      }

      setUserEmail(data.session?.user.email ?? null);
      setAuthLoading(false);
    }

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
      setAuthLoading(false);
    });

    loadSession();

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;

    let active = true;

    async function loadEvents() {
      const { data, error } = await client
        .from("events")
        .select("id, title, date, time, location, description, price, extra_prices, places, visibility, schedule, activities")
        .order("date", { ascending: true });

      if (!active) {
        return;
      }

      if (error) {
        setEventsError(error.message);
        setEvents([]);
        return;
      }

      setEventsError("");
      setEvents(
        (data ?? []).map((row) => ({
          id: String(row.id),
          title: row.title ?? "Sans titre",
          date: row.date ?? "",
          time: row.time ?? "",
          location: row.location ?? "",
          description: row.description ?? "",
          entryPrice: Number(row.price ?? 0),
          extraPrices: Array.isArray(row.extra_prices) ? (row.extra_prices as PriceItem[]) : [],
          places: Number(row.places ?? 0),
          visibility: (row.visibility ?? "public") as Visibility,
          schedule: Array.isArray(row.schedule) ? (row.schedule as ScheduleItem[]) : [],
          activities: Array.isArray(row.activities) ? (row.activities as string[]) : [],
        })),
      );
    }

    loadEvents();

    return () => {
      active = false;
    };
  }, []);

  const sortedEvents = useMemo(
    () => [...events].sort((left, right) => left.date.localeCompare(right.date)),
    [events],
  );

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId),
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

  async function logout() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setUserEmail(null);
    setView("home");
    setSelectedEventId(null);
  }

  function openEdit(event: EventRecord) {
    setEditingEvent(event);
    setView("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (supabase) {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) { setEventsError(error.message); return; }
    }
    setEvents((current) => current.filter((e) => e.id !== id));
    navigate("planning");
  }

  async function handleUpdate(event: EventRecord) {
    setSavingEvent(true);

    let nextEvent = event;

    if (supabase) {
      const { data, error } = await supabase
        .from("events")
        .update({
          title: event.title,
          date: event.date,
          time: event.time,
          location: event.location,
          description: event.description,
          price: event.entryPrice,
          extra_prices: event.extraPrices,
          places: event.places > 0 ? event.places : null,
          visibility: event.visibility,
          schedule: event.schedule,
          activities: event.activities,
        })
        .eq("id", event.id)
        .select("id, title, date, time, location, description, price, extra_prices, places, visibility, schedule, activities")
        .single();

      if (error) { setEventsError(error.message); setSavingEvent(false); return; }

      if (data) {
        nextEvent = {
          id: String(data.id),
          title: data.title ?? event.title,
          date: data.date ?? event.date,
          time: data.time ?? event.time,
          location: data.location ?? event.location,
          description: data.description ?? event.description,
          entryPrice: Number(data.price ?? event.entryPrice),
          extraPrices: Array.isArray(data.extra_prices) ? (data.extra_prices as PriceItem[]) : event.extraPrices,
          places: Number(data.places ?? 0),
          visibility: (data.visibility ?? event.visibility) as Visibility,
          schedule: Array.isArray(data.schedule) ? (data.schedule as ScheduleItem[]) : event.schedule,
          activities: Array.isArray(data.activities) ? (data.activities as string[]) : event.activities,
        };
      }
    }

    setEvents((current) => current.map((e) => e.id === nextEvent.id ? nextEvent : e));
    setSelectedEventId(nextEvent.id);
    setEditingEvent(null);
    setView("detail");
    setSavingEvent(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleCreate(event: EventRecord) {
    setSavingEvent(true);

    let nextEvent = event;

    if (supabase) {
      const { data, error } = await supabase
        .from("events")
        .insert({
          title: event.title,
          date: event.date,
          time: event.time,
          location: event.location,
          description: event.description,
          price: event.entryPrice,
          extra_prices: event.extraPrices,
          places: event.places > 0 ? event.places : null,
          visibility: event.visibility,
          schedule: event.schedule,
          activities: event.activities,
        })
        .select("id, title, date, time, location, description, price, extra_prices, places, visibility, schedule, activities")
        .single();

      if (error) {
        setEventsError(error.message);
        setSavingEvent(false);
        return;
      }

      if (data) {
        nextEvent = {
          id: String(data.id),
          title: data.title ?? event.title,
          date: data.date ?? event.date,
          time: data.time ?? event.time,
          location: data.location ?? event.location,
          description: data.description ?? event.description,
          entryPrice: Number(data.price ?? event.entryPrice),
          extraPrices: Array.isArray(data.extra_prices) ? (data.extra_prices as PriceItem[]) : event.extraPrices,
          places: Number(data.places ?? 0),
          visibility: (data.visibility ?? event.visibility) as Visibility,
          schedule: Array.isArray(data.schedule) ? (data.schedule as ScheduleItem[]) : event.schedule,
          activities: Array.isArray(data.activities) ? (data.activities as string[]) : event.activities,
        };
      }
    }

    setEvents((current) => [nextEvent, ...current]);
    setSelectedEventId(nextEvent.id);
    setView("detail");
    setSavingEvent(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleAuthenticate(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    setAuthError("");

    if (!normalizedEmail || !password.trim()) {
      setAuthError("Email et mot de passe requis.");
      return;
    }

    setAuthSubmitting(true);

    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setAuthError(error.message);
        setAuthSubmitting(false);
        return;
      }

      setUserEmail(data.user?.email ?? data.session?.user.email ?? normalizedEmail);
      setAuthSubmitting(false);
      return;
    }

    if (allowedEmails.length > 0 && !allowedEmails.includes(normalizedEmail)) {
      setAuthError("Cet email n'est pas encore autorisé pour le BDE.");
      setAuthSubmitting(false);
      return;
    }

    setUserEmail(normalizedEmail);
    setAuthSubmitting(false);
  }

  if (isInviteFlow) {
    return <SetPasswordScreen />;
  }

  if (authLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <div className="brand-row">
            <img src={logoBDE} className="brand-mark" alt="Logo BDE" />
            <div>
              <div className="brand-name">BDE Epitech Réunion</div>
              <div className="brand-subtitle">Chargement...</div>
            </div>
          </div>
          <p>Chargement de l&apos;espace membre.</p>
        </section>
      </main>
    );
  }

  if (!userEmail) {
    return <AuthScreen onAuthenticate={handleAuthenticate} error={authError} isLoading={authSubmitting} />;
  }

  return (
    <div className="app-shell">
      <Navbar view={view} onNavigate={navigate} onLogout={logout} />

      {eventsError ? (
        <div className="wrap" style={{ paddingTop: 18 }}>
          <div className="form-error">{eventsError}</div>
        </div>
      ) : null}

      {view === "home" ? (
        <HomeView onNavigate={navigate} />
      ) : null}

      {view === "planning" ? (
        <PlanningView
          events={sortedEvents}
          filter={filter}
          onFilterChange={setFilter}
          onOpenEvent={openEvent}
          shortDateFormatter={formatters.shortDate}
        />
      ) : null}

      {view === "detail" ? (
        <EventDetailView
          event={selectedEvent}
          onBack={() => navigate("planning")}
          onEdit={openEdit}
          onDelete={handleDelete}
          longDateFormatter={formatters.longDate}
        />
      ) : null}

      {view === "create" ? (
        <CreateEventView
          existingEvent={editingEvent ?? undefined}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onCancel={() => { setEditingEvent(null); navigate(editingEvent ? "detail" : "planning"); }}
          saving={savingEvent}
        />
      ) : null}

      <footer className="footer wrap">
        <span>BDE Epitech Réunion</span>
        <span>{events.length} événement(s)</span>
      </footer>
    </div>
  );
}

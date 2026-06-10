import { useNavigate } from "react-router-dom";
import type { EventRecord, Visibility } from "../types";
import { EventCard } from "../components/EventCard";

export function PlanningView({
  events,
  filter,
  onFilterChange,
  shortDateFormatter,
}: {
  events: EventRecord[];
  filter: "all" | Visibility;
  onFilterChange: (next: "all" | Visibility) => void;
  shortDateFormatter: Intl.DateTimeFormat;
}) {
  const navigate = useNavigate();

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
                  <EventCard key={event.id} event={event} shortDateFormatter={shortDateFormatter} onOpen={() => navigate(`/events/${event.id}`)} />
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
                    <EventCard key={event.id} event={event} shortDateFormatter={shortDateFormatter} onOpen={() => navigate(`/events/${event.id}`)} past />
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

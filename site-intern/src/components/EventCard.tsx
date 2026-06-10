import type { EventRecord } from "../types";
import { Badge } from "./Badge";
import { Icon } from "./Icon";
import { formatDayLabel, formatPrice } from "../lib/formatters";

export function EventCard({
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

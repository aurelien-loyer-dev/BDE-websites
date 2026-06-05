import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import logoBDE from "./public/logoBDE.jpg";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(value: number): string {
  return value === 0 ? "Gratuit" : `${value.toFixed(0)} €`;
}

const longDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDateLong(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  const raw = longDateFormatter.format(d);
  // Capitalize first letter
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatCurrentDateTime(date: Date): string {
  const dayName = date.toLocaleDateString("fr-FR", { weekday: "long" });
  const day = date.getDate();
  const month = date.toLocaleDateString("fr-FR", { month: "long" });
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const capitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  return `${capitalized} ${day} ${month} ${year} · ${hours}:${minutes}`;
}

function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function IconCalendar() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 2.5v4" />
      <path d="M16 2.5v4" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

function IconEuro() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 5.5A7 7 0 1 0 17 18.5" />
      <path d="M4 10h9" />
      <path d="M4 14h7" />
    </svg>
  );
}

// ─── Supabase fetch ───────────────────────────────────────────────────────────

async function fetchPublicEvents(): Promise<EventRecord[]> {
  if (!supabase) return [];

  const today = getTodayISO();

  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, date, time, location, description, price, extra_prices, places, visibility, schedule, activities",
    )
    .eq("visibility", "public")
    .gte("date", today)
    .order("date", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
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
  }));
}

// ─── EventSlide ───────────────────────────────────────────────────────────────

function EventSlide({ event }: { event: EventRecord }) {
  const tag =
    event.activities.length > 0 ? event.activities[0] : "Événement BDE";

  const scheduleItems = event.schedule.slice(0, 5);

  return (
    <div className="kiosk-event">
      {/* Left — narrative */}
      <div className="kiosk-main">
        <div className="kiosk-slide-brand">
          <img src={logoBDE} className="kiosk-slide-logo" alt="Logo BDE" />
        </div>
        <div className="kiosk-tag">{tag}</div>
        <h1 className="kiosk-title">{event.title}</h1>
        {event.description ? (
          <p className="kiosk-description">{event.description}</p>
        ) : null}
      </div>

      {/* Right — fiche factuelle */}
      <div className="kiosk-sidebar">
        <div className="kiosk-info-card">
          <div className="kiosk-info-row">
            <span className="kiosk-info-label">Date</span>
            <span className="kiosk-info-value">{formatDateLong(event.date)}</span>
          </div>
          <div className="kiosk-info-row">
            <span className="kiosk-info-label">Heure</span>
            <span className="kiosk-info-value">{event.time || "À définir"}</span>
          </div>
          <div className="kiosk-info-row">
            <span className="kiosk-info-label">Lieu</span>
            <span className="kiosk-info-value">{event.location || "À définir"}</span>
          </div>
          <div className="kiosk-info-row">
            <span className="kiosk-info-label">Tarif d'entrée</span>
            <span className="kiosk-info-value">{formatPrice(event.entryPrice)}</span>
            {event.extraPrices.length > 0 ? (
              <div className="kiosk-extra-prices">
                {event.extraPrices.map((item, i) => (
                  <div className="kiosk-extra-price-row" key={i}>
                    <span className="kiosk-extra-price-label">{item.label}</span>
                    <span className="kiosk-extra-price-amount">{formatPrice(item.amount)}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="kiosk-info-row">
            <span className="kiosk-info-label">Places</span>
            <span className="kiosk-info-value">
              {event.places > 0 ? `${event.places} disponibles` : "Non limité"}
            </span>
          </div>
        </div>

        {scheduleItems.length > 0 ? (
          <div className="kiosk-timeline">
            <div className="kiosk-timeline-header">Programme</div>
            {scheduleItems.map((item, index) => (
              <div className="kiosk-timeline-item" key={`${item.time}-${index}`}>
                <span className="kiosk-timeline-time">{item.time || "--:--"}</span>
                <span className="kiosk-timeline-title">{item.title}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

const SLIDE_DURATION_MS = 8000;
const TICK_MS = 80;
const REFETCH_MS = 5 * 60 * 1000;

function useKioskScale() {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    function update() {
      const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      setStyle({
        transform: `scale(${s})`,
        transformOrigin: "top left",
        position: "absolute",
        top: (window.innerHeight - 1080 * s) / 2,
        left: (window.innerWidth - 1920 * s) / 2,
      });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return style;
}

export default function App() {
  const kioskStyle = useKioskScale();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentDateTime, setCurrentDateTime] = useState(() =>
    formatCurrentDateTime(new Date()),
  );

  // Initial load + realtime subscription + fallback refetch
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    let cancelled = false;

    async function load(preserveIndex = false) {
      const result = await fetchPublicEvents();
      if (cancelled) return;
      setEvents(result);
      if (!preserveIndex) {
        setCurrentIndex(0);
        setProgress(0);
      } else {
        setCurrentIndex((idx) => (result.length > 0 ? Math.min(idx, result.length - 1) : 0));
      }
    }

    load(false);

    const channel = client
      .channel("kiosk-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        load(true);
      })
      .subscribe();

    const refetchInterval = setInterval(() => load(true), REFETCH_MS);

    return () => {
      cancelled = true;
      clearInterval(refetchInterval);
      client.removeChannel(channel);
    };
  }, []);

  // Clock update every minute
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentDateTime(formatCurrentDateTime(new Date()));
    }, 60_000);

    return () => clearInterval(clockInterval);
  }, []);

  // Slideshow progress
  const eventsRef = useRef(events);
  const currentIndexRef = useRef(currentIndex);

  eventsRef.current = events;
  currentIndexRef.current = currentIndex;

  useEffect(() => {
    if (events.length === 0) return;

    const increment = (TICK_MS / SLIDE_DURATION_MS) * 100;

    const ticker = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          const total = eventsRef.current.length;
          if (total > 0) {
            setCurrentIndex((idx) => (idx + 1) % total);
          }
          return 0;
        }
        return next;
      });
    }, TICK_MS);

    return () => clearInterval(ticker);
  }, [events.length]);

  const currentEvent = events[currentIndex] ?? null;

  return (
    <div className="kiosk-viewport">
    <div className="kiosk-shell" style={kioskStyle}>
      {/* Header */}
      <header className="kiosk-header">
        <span className="kiosk-brand">BDE Epitech Réunion</span>
        <span className="kiosk-date">{currentDateTime}</span>
      </header>

      {/* Content */}
      <div className="kiosk-content">
        {currentEvent ? (
          <EventSlide event={currentEvent} />
        ) : (
          <div className="kiosk-empty">
            Aucun événement à venir · BDE Epitech Réunion
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="kiosk-progress">
        <div
          className="kiosk-progress-bar"
          style={{
            width: `${progress}%`,
            transitionDuration: `${TICK_MS}ms`,
          }}
        />
      </div>

      {/* Counter */}
      {events.length > 0 ? (
        <div className="kiosk-counter">
          {currentIndex + 1} / {events.length}
        </div>
      ) : null}
    </div>
    </div>
  );
}

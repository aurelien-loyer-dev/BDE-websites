import { useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
import { useFormatters } from "./lib/formatters";
import type { EventRecord, GFormRecord, PriceItem, Role, ScheduleItem, Visibility } from "./types";
import { Navbar } from "./components/Navbar";
import { AuthScreen, CreatePasswordScreen } from "./pages/Auth";
import { HomeView } from "./pages/Home";
import { PlanningView } from "./pages/Events";
import { EventDetailView } from "./pages/EventDetail";
import { CreateEventView } from "./pages/CreateEvent";
import { FormsView } from "./pages/forms/FormsList";
import { FormDetailView } from "./pages/forms/FormDetail";
import { AdminView } from "./pages/Admin";
import logoBDE from "./public/logoBDE.jpg";

const allowedEmails = (import.meta.env.VITE_ALLOWED_EMAILS as string | undefined)
  ?.split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean) ?? [];

function EventDetailRoute({ events, onDelete, longDateFormatter, isAdmin, userEmail, userId }: { events: EventRecord[]; onDelete: (id: string) => void; longDateFormatter: Intl.DateTimeFormat; isAdmin: boolean; userEmail: string; userId: string | null }) {
  const { id } = useParams<{ id: string }>();
  const event = events.find((e) => e.id === id);
  return <EventDetailView event={event} onDelete={onDelete} longDateFormatter={longDateFormatter} isAdmin={isAdmin} userEmail={userEmail} userId={userId} />;
}

function CreateEventEditRoute({ events, onUpdate, saving }: { events: EventRecord[]; onUpdate: (event: EventRecord) => Promise<void>; saving: boolean }) {
  const { id } = useParams<{ id: string }>();
  const existingEvent = events.find((e) => e.id === id);
  return <CreateEventView existingEvent={existingEvent} onUpdate={onUpdate} saving={saving} />;
}

function FormDetailRoute({ forms, isAdmin, events, onFormUpdated }: { forms: GFormRecord[]; isAdmin: boolean; events: EventRecord[]; onFormUpdated: (form: GFormRecord) => void }) {
  const { id } = useParams<{ id: string }>();
  const form = forms.find((f) => f.id === id);
  return <FormDetailView form={form} isAdmin={isAdmin} events={events} onFormUpdated={onFormUpdated} />;
}

export default function App() {
  const navigate = useNavigate();

  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authLoading, setAuthLoading] = useState(hasSupabaseConfig);
  const [authError, setAuthError] = useState("");
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [filter, setFilter] = useState<"all" | Visibility>("all");
  const [eventsError, setEventsError] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);
  const [gForms, setGForms] = useState<GFormRecord[]>([]);
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
      if (!active) return;
      if (error) setAuthError(error.message);
      setUserEmail(data.session?.user.email ?? null);
      setUserId(data.session?.user.id ?? null);
      setAuthLoading(false);
    }

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
      setUserId(session?.user.id ?? null);
      setAuthLoading(false);
    });

    loadSession();

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const client = supabase;
    let active = true;

    async function loadEvents() {
      const { data, error } = await client
        .from("events")
        .select("id, title, date, time, location, description, price, extra_prices, places, visibility, schedule, activities")
        .order("date", { ascending: true });

      if (!active) return;

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
    return () => { active = false; };
  }, []);

  async function refreshForms() {
    if (!supabase) return;
    const { data } = await supabase
      .from("forms")
      .select("id, name, google_form_url, spreadsheet_id, created_at, event_mapping")
      .order("created_at", { ascending: false });
    setGForms((data as GFormRecord[]) ?? []);
  }

  useEffect(() => {
    if (!userEmail) return;
    refreshForms();
  }, [userEmail]);

  useEffect(() => {
    if (!supabase || !userId) { setRole(null); return; }
    supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()
      .then(({ data }) => setRole((data?.role as Role) ?? "member"));
  }, [userId]);

  const isAdmin = role === "admin";

  const sortedEvents = useMemo(
    () => [...events].sort((left, right) => left.date.localeCompare(right.date)),
    [events],
  );

  function go(path: string) {
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    setUserEmail(null);
    setUserId(null);
    setRole(null);
    navigate("/");
  }

  function handlePasswordCreated() {
    setNeedsPasswordSetup(false);
    navigate("/");
  }

  async function handleDelete(id: string) {
    if (supabase) {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) { setEventsError(error.message); return; }
    }
    setEvents((current) => current.filter((e) => e.id !== id));
    go("/events");
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
    setSavingEvent(false);
    go(`/events/${nextEvent.id}`);
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

    setEvents((current) => [nextEvent, ...current]);
    setSavingEvent(false);
    go(`/events/${nextEvent.id}`);
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
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

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

  if (needsPasswordSetup) {
    return <CreatePasswordScreen onDone={handlePasswordCreated} />;
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
    return <AuthScreen onAuthenticate={handleAuthenticate} onOtpVerified={() => setNeedsPasswordSetup(true)} error={authError} isLoading={authSubmitting} />;
  }

  return (
    <div className="app-shell">
      <Navbar onLogout={logout} isAdmin={isAdmin} />

      {eventsError ? (
        <div className="wrap" style={{ paddingTop: 18 }}>
          <div className="form-error">{eventsError}</div>
        </div>
      ) : null}

      <Routes>
        <Route path="/" element={<HomeView isAdmin={isAdmin} />} />
        <Route path="/events" element={<PlanningView events={sortedEvents} filter={filter} onFilterChange={setFilter} shortDateFormatter={formatters.shortDate} />} />
        <Route path="/events/new" element={<CreateEventView onCreate={handleCreate} saving={savingEvent} />} />
        <Route path="/events/:id/edit" element={<CreateEventEditRoute events={events} onUpdate={handleUpdate} saving={savingEvent} />} />
        <Route path="/events/:id" element={<EventDetailRoute events={events} onDelete={handleDelete} longDateFormatter={formatters.longDate} isAdmin={isAdmin} userEmail={userEmail ?? ""} userId={userId} />} />
        <Route path="/forms" element={<FormsView forms={gForms} onFormAdded={(form) => setGForms((prev) => [form, ...prev])} onFormUpdated={(form) => setGForms((prev) => prev.map((f) => f.id === form.id ? form : f))} onFormDeleted={(id) => setGForms((prev) => prev.filter((f) => f.id !== id))} onRefetch={refreshForms} isAdmin={isAdmin} />} />
        <Route path="/forms/:id" element={<FormDetailRoute forms={gForms} isAdmin={isAdmin} events={events} onFormUpdated={(form) => setGForms((prev) => prev.map((f) => f.id === form.id ? form : f))} />} />
        <Route path="/admin" element={isAdmin ? <AdminView /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <footer className="footer wrap">
        <span>BDE Epitech Réunion</span>
        <span>{events.length} événement(s)</span>
      </footer>
    </div>
  );
}

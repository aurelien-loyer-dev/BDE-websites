import { useEffect, useMemo, useState } from "react";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
import { useFormatters } from "./lib/formatters";
import type { EventRecord, GFormRecord, PriceItem, ScheduleItem, View, Visibility } from "./types";
import { Navbar } from "./components/Navbar";
import { AuthScreen, CreatePasswordScreen } from "./pages/Auth";
import { HomeView } from "./pages/Home";
import { PlanningView } from "./pages/Events";
import { EventDetailView } from "./pages/EventDetail";
import { CreateEventView } from "./pages/CreateEvent";
import { FormsView } from "./pages/forms/FormsList";
import { FormDetailView } from "./pages/forms/FormDetail";
import logoBDE from "./public/logoBDE.jpg";

const allowedEmails = (import.meta.env.VITE_ALLOWED_EMAILS as string | undefined)
  ?.split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean) ?? [];

export default function App() {
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
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
  const [gForms, setGForms] = useState<GFormRecord[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
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

  useEffect(() => {
    if (!supabase || !userEmail) return;

    async function loadForms() {
      const { data } = await supabase!
        .from("forms")
        .select("id, name, spreadsheet_id, created_at")
        .order("created_at", { ascending: false });
      setGForms((data as GFormRecord[]) ?? []);
    }

    loadForms();
  }, [userEmail]);

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

  function handlePasswordCreated() {
    setNeedsPasswordSetup(false);
    setView("home");
  }

  function openEdit(event: EventRecord) {
    setEditingEvent(event);
    setView("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openForm(id: string) {
    setSelectedFormId(id);
    setView("form-detail");
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

      {view === "forms" ? (
        <FormsView
          forms={gForms}
          onOpenForm={openForm}
          onAddForm={() => setShowAddForm(true)}
          showAddForm={showAddForm}
          onFormAdded={(form) => { setGForms((prev) => [form, ...prev]); setShowAddForm(false); }}
          onCloseAddForm={() => setShowAddForm(false)}
        />
      ) : null}

      {view === "form-detail" ? (
        <FormDetailView
          form={gForms.find((f) => f.id === selectedFormId)}
          onBack={() => navigate("forms")}
        />
      ) : null}

      <footer className="footer wrap">
        <span>BDE Epitech Réunion</span>
        <span>{events.length} événement(s)</span>
      </footer>
    </div>
  );
}

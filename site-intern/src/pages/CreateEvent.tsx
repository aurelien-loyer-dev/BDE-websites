import { FormEvent, useState } from "react";
import type { EventRecord, FormState, PriceItem, ScheduleItem } from "../types";
import { Icon } from "../components/Icon";
import { FieldLabel } from "../components/FieldLabel";
import { createId } from "../lib/formatters";

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

export function CreateEventView({
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
              {activities.map((activity) => (
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

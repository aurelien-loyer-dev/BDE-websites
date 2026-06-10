import { FormEvent, useState } from "react";
import type { GFormRecord } from "../../types";
import { supabase } from "../../lib/supabase";
import { Icon } from "../../components/Icon";
import { FieldLabel } from "../../components/FieldLabel";

function AddFormModal({ onSave, onClose }: { onSave: (form: GFormRecord) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [sheetId, setSheetId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedFormUrl = formUrl.trim();
    const trimmedSheetId = sheetId.trim();

    if (!trimmedName) { setError("Le nom du formulaire est requis."); return; }
    if (!trimmedFormUrl) { setError("L'URL Google Form est requise."); return; }
    if (!trimmedSheetId) { setError("L'ID Google Sheet est requis."); return; }
    if (!supabase) { setError("Connexion à Supabase indisponible."); return; }

    setSubmitting(true);
    const { data, error: insertError } = await supabase
      .from("forms")
      .insert({ name: trimmedName, google_form_url: trimmedFormUrl, spreadsheet_id: trimmedSheetId })
      .select()
      .single();

    if (insertError) { setError(insertError.message); setSubmitting(false); return; }

    setSubmitting(false);
    onSave(data as GFormRecord);
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel">
        <div className="modal-header">
          <h2>Ajouter un formulaire</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer">
            <Icon name="close" />
          </button>
        </div>

        {error ? <div className="form-error">{error}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="modal-fields">
            <div className="field">
              <FieldLabel>Nom du formulaire</FieldLabel>
              <input
                className="input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Inscription soirée"
                autoFocus
              />
            </div>

            <div className="field">
              <FieldLabel>URL Google Form</FieldLabel>
              <input
                className="input"
                type="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://docs.google.com/forms/d/…"
              />
            </div>

            <div className="field">
              <FieldLabel>ID Google Sheet</FieldLabel>
              <input
                className="input"
                type="text"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                placeholder="Ex. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              />
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: 20 }}>
            <button className="btn" type="button" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FormsView({
  forms,
  onOpenForm,
  onAddForm,
  showAddForm,
  onFormAdded,
  onCloseAddForm,
}: {
  forms: GFormRecord[];
  onOpenForm: (id: string) => void;
  onAddForm: () => void;
  showAddForm: boolean;
  onFormAdded: (form: GFormRecord) => void;
  onCloseAddForm: () => void;
}) {
  return (
    <>
      <section className="block">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">Outils</div>
              <h2>Formulaires</h2>
            </div>
            <button className="btn btn-primary" type="button" onClick={onAddForm}>
              <Icon name="plus" /> Ajouter un formulaire
            </button>
          </div>

          {forms.length === 0 ? (
            <p className="muted-text">Aucun formulaire enregistré.</p>
          ) : (
            <div className="forms-list">
              {forms.map((form) => (
                <div key={form.id} className="form-row">
                  <div className="form-row-info">
                    <span className="form-row-name">{form.name}</span>
                    <span className="form-row-date">
                      {new Date(form.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <button className="btn btn-small" type="button" onClick={() => onOpenForm(form.id)}>
                    Voir les réponses
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {showAddForm ? (
        <AddFormModal
          onSave={onFormAdded}
          onClose={onCloseAddForm}
        />
      ) : null}
    </>
  );
}

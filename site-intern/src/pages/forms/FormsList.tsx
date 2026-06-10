import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { GFormRecord } from "../../types";
import { supabase } from "../../lib/supabase";
import { Icon } from "../../components/Icon";
import { FieldLabel } from "../../components/FieldLabel";

function FormModal({
  existingForm,
  onSave,
  onClose,
}: {
  existingForm?: GFormRecord;
  onSave: (form: GFormRecord) => void;
  onClose: () => void;
}) {
  const isEditing = Boolean(existingForm);
  const [name, setName] = useState(existingForm?.name ?? "");
  const [formUrl, setFormUrl] = useState(existingForm?.google_form_url ?? "");
  const [sheetId, setSheetId] = useState(existingForm?.spreadsheet_id ?? "");
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

    if (isEditing && existingForm) {
      console.log("[FormsList] update", { id: existingForm.id, name: trimmedName, google_form_url: trimmedFormUrl, spreadsheet_id: trimmedSheetId });
      const { data, error: updateError } = await supabase
        .from("forms")
        .update({ name: trimmedName, google_form_url: trimmedFormUrl, spreadsheet_id: trimmedSheetId })
        .eq("id", existingForm.id)
        .select();

      if (updateError) { setError(updateError.message); setSubmitting(false); return; }
      setSubmitting(false);
      onSave((data?.[0] ?? existingForm) as GFormRecord);
    } else {
      const { data, error: insertError } = await supabase
        .from("forms")
        .insert({ name: trimmedName, google_form_url: trimmedFormUrl, spreadsheet_id: trimmedSheetId })
        .select()
        .single();

      if (insertError) { setError(insertError.message); setSubmitting(false); return; }
      setSubmitting(false);
      onSave(data as GFormRecord);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel">
        <div className="modal-header">
          <h2>{isEditing ? "Modifier le formulaire" : "Ajouter un formulaire"}</h2>
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
              {submitting ? "Enregistrement…" : isEditing ? "Mettre à jour" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FormsView({
  forms,
  onFormAdded,
  onFormUpdated,
  onFormDeleted,
  onRefetch,
}: {
  forms: GFormRecord[];
  onFormAdded: (form: GFormRecord) => void;
  onFormUpdated: (form: GFormRecord) => void;
  onFormDeleted: (id: string) => void;
  onRefetch: () => void;
}) {
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingForm, setEditingForm] = useState<GFormRecord | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete(form: GFormRecord) {
    if (!window.confirm(`Supprimer le formulaire "${form.name}" ?`)) return;
    if (!supabase) return;
    const { error } = await supabase.from("forms").delete().eq("id", form.id);
    if (error) { setDeleteError(error.message); return; }
    onFormDeleted(form.id);
  }

  return (
    <>
      <section className="block">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">Outils</div>
              <h2>Formulaires</h2>
            </div>
            <button className="btn btn-primary" type="button" onClick={() => setShowAddForm(true)}>
              <Icon name="plus" /> Ajouter un formulaire
            </button>
          </div>

          {deleteError ? <div className="form-error" style={{ marginBottom: 16 }}>{deleteError}</div> : null}

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
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-small" type="button" onClick={() => navigate(`/forms/${form.id}`)}>
                      Voir les réponses
                    </button>
                    <button className="btn btn-small" type="button" onClick={() => setEditingForm(form)}>
                      <Icon name="edit" /> Modifier
                    </button>
                    <button className="btn btn-small btn-danger" type="button" onClick={() => handleDelete(form)}>
                      <Icon name="trash" /> Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {showAddForm ? (
        <FormModal
          onSave={(form) => { onFormAdded(form); setShowAddForm(false); }}
          onClose={() => setShowAddForm(false)}
        />
      ) : null}

      {editingForm ? (
        <FormModal
          existingForm={editingForm}
          onSave={(form) => { onFormUpdated(form); setEditingForm(null); onRefetch(); }}
          onClose={() => setEditingForm(null)}
        />
      ) : null}
    </>
  );
}

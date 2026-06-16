import { FormEvent, useEffect, useState } from "react";
import type { ArdoiseItem } from "../types";
import { supabase } from "../lib/supabase";
import { Icon } from "../components/Icon";
import { FieldLabel } from "../components/FieldLabel";

type Member = { id: string; name: string; email: string };

// ─── Item table (shared between own view and admin-viewing-member) ────────────

function ArdoiseSection({
  items,
  targetUserId,
  onItemsChange,
}: {
  items: ArdoiseItem[];
  targetUserId: string;
  onItemsChange: (items: ArdoiseItem[]) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newArticle, setNewArticle] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const unpaid = items.filter((i) => !i.paid);
  const paid = items.filter((i) => i.paid);

  async function togglePaid(item: ArdoiseItem) {
    if (!supabase) return;
    const { error } = await supabase
      .from("ardoise_items")
      .update({ paid: !item.paid })
      .eq("id", item.id);
    if (!error) onItemsChange(items.map((i) => i.id === item.id ? { ...i, paid: !i.paid } : i));
  }

  async function deleteItem(id: string) {
    if (!supabase) return;
    await supabase.from("ardoise_items").delete().eq("id", id);
    onItemsChange(items.filter((i) => i.id !== id));
  }

  async function payAll() {
    if (!supabase) return;
    const ids = unpaid.map((i) => i.id);
    if (ids.length === 0) return;
    await supabase.from("ardoise_items").update({ paid: true }).in("id", ids);
    onItemsChange(items.map((i) => ({ ...i, paid: true })));
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const article = newArticle.trim();
    const qty = parseInt(newQuantity, 10);
    if (!article || isNaN(qty) || qty <= 0 || !supabase) return;
    setAddSubmitting(true);
    const { data } = await supabase
      .from("ardoise_items")
      .insert({ user_id: targetUserId, article, quantity: qty, paid: false })
      .select("*")
      .single();
    if (data) onItemsChange([...items, data as ArdoiseItem]);
    setNewArticle("");
    setNewQuantity("1");
    setAddSubmitting(false);
    setShowAdd(false);
  }

  function renderTable(rows: ArdoiseItem[], dimmed = false) {
    return (
      <div className="registrations-table-wrap" style={{ opacity: dimmed ? 0.65 : 1 }}>
        <table className="registrations-table">
          <thead>
            <tr>
              <th>Article</th>
              <th>Quantité</th>
              <th>Payé</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <td>{item.article}</td>
                <td>{item.quantity}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={item.paid}
                    onChange={() => togglePaid(item)}
                    style={{ cursor: "pointer", width: 16, height: 16 }}
                  />
                </td>
                <td>
                  <button
                    className="btn btn-small btn-danger"
                    type="button"
                    onClick={() => { if (window.confirm(`Supprimer "${item.article}" ?`)) deleteItem(item.id); }}
                  >
                    <Icon name="trash" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="registrations-header" style={{ marginBottom: 16 }}>
        <div />
        <div style={{ display: "flex", gap: 8 }}>
          {unpaid.length > 0 ? (
            <button className="btn btn-small btn-primary" type="button" onClick={payAll}>
              Tout payer
            </button>
          ) : null}
          <button className="btn btn-small" type="button" onClick={() => setShowAdd((v) => !v)}>
            <Icon name="plus" /> Ajouter une ligne
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd ? (
        <form onSubmit={handleAdd} style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
          <div className="field" style={{ flex: "1 1 180px" }}>
            <FieldLabel>Article</FieldLabel>
            <input
              className="input"
              type="text"
              value={newArticle}
              onChange={(e) => setNewArticle(e.target.value)}
              placeholder="Ex. Kebab"
              autoFocus
            />
          </div>
          <div className="field" style={{ width: 100 }}>
            <FieldLabel>Quantité</FieldLabel>
            <input
              className="input"
              type="number"
              min={1}
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 8, paddingBottom: 2 }}>
            <button className="btn btn-primary" type="submit" disabled={addSubmitting}>
              {addSubmitting ? "Ajout…" : "Ajouter"}
            </button>
            <button className="btn" type="button" onClick={() => setShowAdd(false)}>
              Annuler
            </button>
          </div>
        </form>
      ) : null}

      {/* Unpaid items */}
      {unpaid.length === 0 && paid.length === 0 ? (
        <div className="empty-inline">Aucune ligne sur l&apos;ardoise.</div>
      ) : unpaid.length === 0 ? (
        <div className="empty-inline" style={{ marginBottom: 20 }}>Tout est payé ✓</div>
      ) : (
        renderTable(unpaid)
      )}

      {/* Paid items — collapsible Historique */}
      {paid.length > 0 ? (
        <div style={{ marginTop: 24 }}>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", opacity: 0.6, padding: 0 }}
          >
            <span style={{ display: "inline-block", transform: showHistory ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>▶</span>
            Historique ({paid.length} payé{paid.length !== 1 ? "s" : ""})
          </button>
          {showHistory ? (
            <div style={{ marginTop: 12 }}>
              {renderTable(paid, true)}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function ArdoiseView({ isAdmin, userId }: { isAdmin: boolean; userId: string | null }) {
  const [tab, setTab] = useState<"mine" | "all">("mine");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Items for current view
  const [items, setItems] = useState<ArdoiseItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Admin member list
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const targetUserId = tab === "mine" ? userId : (selectedMember?.id ?? null);

  // Load items when target user changes
  useEffect(() => {
    if (!targetUserId || !supabase) { setItems([]); return; }
    setLoadingItems(true);
    supabase
      .from("ardoise_items")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setItems((data ?? []) as ArdoiseItem[]);
        setLoadingItems(false);
      });
  }, [targetUserId]);

  // Load member list when switching to "all" tab
  useEffect(() => {
    if (tab !== "all" || !isAdmin || !supabase) return;
    setLoadingMembers(true);

    async function loadMembers() {
      const { data: allItems } = await supabase!.from("ardoise_items").select("user_id");
      const uniqueIds = [...new Set((allItems ?? []).map((i) => String(i.user_id)))];
      if (uniqueIds.length === 0) { setMembers([]); setLoadingMembers(false); return; }

      const { data: profiles } = await supabase!
        .from("profiles")
        .select("id, full_name, email")
        .in("id", uniqueIds);

      setMembers(
        (profiles ?? []).map((p) => ({
          id: String(p.id),
          name: (p.full_name as string | null) ?? (p.email as string | null) ?? p.id,
          email: (p.email as string | null) ?? "",
        }))
      );
      setLoadingMembers(false);
    }

    loadMembers();
  }, [tab, isAdmin]);

  // Reset selected member when switching tabs
  function switchTab(t: "mine" | "all") {
    setTab(t);
    setSelectedMember(null);
    setItems([]);
  }

  const showTable = tab === "mine" || selectedMember !== null;

  return (
    <section className="block">
      <div className="wrap">
        {/* Tab bar — "Toutes les ardoises" admin only */}
        {isAdmin ? (
          <div style={{ display: "flex", borderBottom: "1px solid var(--border, #e2e8f0)", marginBottom: 24 }}>
            {(["mine", "all"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchTab(t)}
                style={{
                  padding: "8px 18px",
                  background: "none",
                  border: "none",
                  borderBottom: tab === t ? "2px solid var(--accent, #3b82f6)" : "2px solid transparent",
                  cursor: "pointer",
                  fontWeight: tab === t ? 600 : 400,
                  fontSize: "0.95rem",
                  color: tab === t ? "var(--accent, #3b82f6)" : "inherit",
                  marginBottom: -1,
                }}
              >
                {t === "mine" ? "Mon ardoise" : "Toutes les ardoises"}
              </button>
            ))}
          </div>
        ) : null}

        {/* ── Mon ardoise / Ardoise d'un membre ── */}
        {showTable ? (
          <>
            <div className="section-head" style={{ marginBottom: 20 }}>
              <div>
                {selectedMember ? (
                  <>
                    <button
                      className="back-link"
                      type="button"
                      onClick={() => { setSelectedMember(null); setItems([]); }}
                      style={{ marginBottom: 8 }}
                    >
                      <Icon name="back" /> Retour aux ardoises
                    </button>
                    <div className="eyebrow">Ardoise</div>
                    <h2>{selectedMember.name}</h2>
                    <div className="muted-text" style={{ fontSize: "0.85rem", marginTop: 2 }}>{selectedMember.email}</div>
                  </>
                ) : (
                  <>
                    <div className="eyebrow">Mon ardoise</div>
                    <h2>Ardoise</h2>
                  </>
                )}
              </div>
            </div>

            {loadingItems ? (
              <div className="loading-shell">Chargement…</div>
            ) : targetUserId ? (
              <ArdoiseSection
                items={items}
                targetUserId={targetUserId}
                onItemsChange={setItems}
              />
            ) : null}
          </>
        ) : null}

        {/* ── Toutes les ardoises (admin member list) ── */}
        {tab === "all" && !selectedMember ? (
          <>
            <div className="section-head" style={{ marginBottom: 20 }}>
              <div>
                <div className="eyebrow">Administration</div>
                <h2>Toutes les ardoises</h2>
              </div>
            </div>

            {loadingMembers ? (
              <div className="loading-shell">Chargement…</div>
            ) : members.length === 0 ? (
              <div className="empty-inline">Aucune ardoise enregistrée.</div>
            ) : (
              <div className="registrations-table-wrap">
                <table className="registrations-table">
                  <thead>
                    <tr>
                      <th>Membre</th>
                      <th>Email</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td>{member.name}</td>
                        <td className="muted-text">{member.email}</td>
                        <td>
                          <button
                            className="btn btn-small"
                            type="button"
                            onClick={() => setSelectedMember(member)}
                          >
                            Voir l&apos;ardoise
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}

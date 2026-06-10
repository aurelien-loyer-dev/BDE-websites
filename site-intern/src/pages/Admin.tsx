import { useEffect, useState } from "react";
import type { Role } from "../types";
import { supabase } from "../lib/supabase";

type Member = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

export function AdminView() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .order("email", { ascending: true })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setMembers((data ?? []) as Member[]);
        setLoading(false);
      });
  }, []);

  async function changeRole(id: string, newRole: Role) {
    if (!supabase) return;
    setSaving(id);
    const { error: err } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", id);
    if (!err) setMembers((prev) => prev.map((m) => m.id === id ? { ...m, role: newRole } : m));
    setSaving(null);
  }

  return (
    <section className="block">
      <div className="wrap">
        <div className="eyebrow">Administration</div>
        <h2>Membres</h2>

        {loading ? (
          <div className="loading-shell">Chargement…</div>
        ) : error ? (
          <div className="form-error">{error}</div>
        ) : members.length === 0 ? (
          <div className="empty-inline">Aucun membre.</div>
        ) : (
          <div className="registrations-table-wrap">
            <table className="registrations-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nom</th>
                  <th>Rôle</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.email}</td>
                    <td>{member.full_name ?? <span className="muted-text">—</span>}</td>
                    <td>
                      <select
                        className="input"
                        value={member.role}
                        disabled={saving === member.id}
                        onChange={(e) => changeRole(member.id, e.target.value as Role)}
                        style={{ width: "auto" }}
                      >
                        <option value="member">Membre</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

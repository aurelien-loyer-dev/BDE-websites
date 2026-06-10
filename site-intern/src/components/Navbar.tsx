import type { View } from "../types";
import logoBDE from "../public/logoBDE.jpg";

export function Navbar({ view, onNavigate, onLogout }: { view: View; onNavigate: (next: View) => void; onLogout: () => void }) {
  const items: Array<{ id: View; label: string }> = [
    { id: "home", label: "Accueil" },
    { id: "planning", label: "Planning" },
  ];

  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <button className="brand-button" type="button" onClick={() => onNavigate("home")}>
          <img src={logoBDE} className="brand-mark" alt="Logo BDE" />
          <span className="brand-name">BDE Epitech Réunion</span>
        </button>

        <nav className="nav-links" aria-label="Navigation principale">
          {items.map((item) => (
            <button key={item.id} className={`nav-link ${view === item.id ? "active" : ""}`} type="button" onClick={() => onNavigate(item.id)}>
              {item.label}
            </button>
          ))}
          <button className="nav-link" type="button" onClick={onLogout}>Déconnexion</button>
        </nav>
      </div>
    </header>
  );
}

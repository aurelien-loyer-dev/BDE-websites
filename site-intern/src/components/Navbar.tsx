import { useNavigate, useLocation } from "react-router-dom";
import logoBDE from "../public/logoBDE.jpg";

export function Navbar({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const items = [
    { path: "/", label: "Accueil" },
    { path: "/events", label: "Planning" },
  ];

  function isActive(path: string) {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  }

  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <button className="brand-button" type="button" onClick={() => navigate("/")}>
          <img src={logoBDE} className="brand-mark" alt="Logo BDE" />
          <span className="brand-name">BDE Epitech Réunion</span>
        </button>

        <nav className="nav-links" aria-label="Navigation principale">
          {items.map((item) => (
            <button
              key={item.path}
              className={`nav-link ${isActive(item.path) ? "active" : ""}`}
              type="button"
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
          <button className="nav-link" type="button" onClick={onLogout}>Déconnexion</button>
        </nav>
      </div>
    </header>
  );
}

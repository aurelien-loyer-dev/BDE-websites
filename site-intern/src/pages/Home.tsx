import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";

export function HomeView({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate();

  return (
    <section className="block">
      <div className="wrap">
        <div className="eyebrow">Tools</div>
        <div className="tools-grid">
          {isAdmin ? (
            <button className="tool-card" type="button" onClick={() => navigate("/events/new")}>
              <span className="tool-card-icon"><Icon name="plus" /></span>
              <span className="tool-card-label">Créer un événement</span>
            </button>
          ) : null}
          <button className="tool-card" type="button" onClick={() => navigate("/forms")}>
            <span className="tool-card-icon"><Icon name="calendar" /></span>
            <span className="tool-card-label">Formulaires</span>
          </button>
        </div>
      </div>
    </section>
  );
}

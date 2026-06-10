import type { View } from "../types";
import { Icon } from "../components/Icon";

export function HomeView({ onNavigate }: { onNavigate: (next: View) => void }) {
  return (
    <section className="block">
      <div className="wrap">
        <div className="eyebrow">Tools</div>
        <div className="tools-grid">
          <button className="tool-card" type="button" onClick={() => onNavigate("create")}>
            <span className="tool-card-icon"><Icon name="plus" /></span>
            <span className="tool-card-label">Créer un événement</span>
          </button>
          <button className="tool-card" type="button" onClick={() => onNavigate("forms")}>
            <span className="tool-card-icon"><Icon name="calendar" /></span>
            <span className="tool-card-label">Formulaires</span>
          </button>
        </div>
      </div>
    </section>
  );
}

import logoBDE from "./public/logoBDE.jpg";

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconLock() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

// ─── Data ────────────────────────────────────────────────────────────────────

type HubLink = {
  title: string;
  subtitle: string;
  href: string;
  locked?: boolean;
};

const LINKS: HubLink[] = [
  {
    title: "Espace membres",
    subtitle: "Gestion interne BDE",
    href: "https://bde-intern.vercel.app/",
    locked: true,
  },
  {
    title: "Site vitrine",
    subtitle: "Découvrir le BDE",
    href: "https://bdepitech-reunion.vercel.app/",
  },
  {
    title: "Site kiosk",
    subtitle: "Affichage événements",
    href: "https://bdepitech-kiosk.vercel.app/",
  },
];

// ─── HubCard ─────────────────────────────────────────────────────────────────

function HubCard({ title, subtitle, href, locked }: HubLink) {
  return (
    <a className="hub-card" href={href} target="_blank" rel="noreferrer">
      {locked ? (
        <span className="badge badge-private">
          <IconLock />
          Accès restreint
        </span>
      ) : null}
      <h2 className="hub-card-title">{title}</h2>
      <p className="hub-card-subtitle">{subtitle}</p>
      <span className="hub-card-link">
        Ouvrir <IconArrow />
      </span>
    </a>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <main className="hub-shell">
      <div className="hub-brand">
        <img src={logoBDE} className="hub-logo" alt="Logo BDE" />
        <span className="hub-brand-name">BDE Epitech Réunion</span>
      </div>

      <div className="hub-cards">
        {LINKS.map((link) => (
          <HubCard key={link.title} {...link} />
        ))}
      </div>
    </main>
  );
}

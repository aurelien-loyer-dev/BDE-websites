export function Icon({ name }: { name: "calendar" | "clock" | "pin" | "users" | "euro" | "back" | "plus" | "trash" | "close" | "edit" }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4.5" width="18" height="16" rx="2" />
          <path d="M3 9h18" />
          <path d="M8 2.5v4" />
          <path d="M16 2.5v4" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="2.6" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 19v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V19" />
          <circle cx="9" cy="7" r="3.2" />
          <path d="M22 19v-1.5a4 4 0 0 0-3-3.85" />
          <path d="M16 3.65a4 4 0 0 1 0 7.7" />
        </svg>
      );
    case "euro":
      return (
        <svg {...common}>
          <path d="M17 5.5A7 7 0 1 0 17 18.5" />
          <path d="M4 10h9" />
          <path d="M4 14h7" />
        </svg>
      );
    case "back":
      return (
        <svg {...common}>
          <path d="M14 6l-6 6 6 6" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M9 7V5h6v2" />
          <path d="M6 7l1 13h10l1-13" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </svg>
      );
    case "edit":
      return (
        <svg {...common}>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
        </svg>
      );
    default:
      return null;
  }
}

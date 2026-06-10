import type { Visibility } from "../types";

export function Badge({ visibility }: { visibility: Visibility }) {
  const isPublic = visibility === "public";
  return (
    <span className={`badge ${isPublic ? "badge-public" : "badge-private"}`}>
      <span className="badge-dot" />
      {isPublic ? "Public" : "Privé"}
    </span>
  );
}

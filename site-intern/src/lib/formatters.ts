import { useMemo } from "react";

export function useFormatters() {
  return useMemo(
    () => ({
      shortDate: new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }),
      longDate: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
    }),
    [],
  );
}

export function formatDayLabel(date: string, formatter: Intl.DateTimeFormat) {
  return formatter.format(new Date(`${date}T00:00:00`));
}

export function formatLongDate(date: string, formatter: Intl.DateTimeFormat) {
  return formatter.format(new Date(`${date}T00:00:00`));
}

export function formatPrice(value: number) {
  return value === 0 ? "Gratuit" : `${value.toFixed(0)} €`;
}

export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return String(Date.now());
}

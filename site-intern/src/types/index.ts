export type Visibility = "public" | "prive";

export type PriceItem = {
  label: string;
  amount: number;
};

export type ScheduleItem = {
  time: string;
  title: string;
  description: string;
};

export type EventRecord = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  entryPrice: number;
  extraPrices: PriceItem[];
  places: number;
  visibility: Visibility;
  schedule: ScheduleItem[];
  activities: string[];
};

export type Registration = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  cursus: string | null;
  created_at: string;
};

export type GFormRecord = {
  id: string;
  name: string;
  google_form_url: string;
  spreadsheet_id: string;
  created_at: string;
};

export type FormState = {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  entryPrice: string;
  places: string;
  visibility: Visibility;
};

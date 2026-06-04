export type Visibility = "public" | "prive";

export type ScheduleItem = {
  time: string;
  description: string;
};

export type EventRecord = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  price: number;
  places: number;
  visibility: Visibility;
  schedule: ScheduleItem[];
  activities: string[];
};

export type EventInsert = Omit<EventRecord, "id">;

export type UserSession = {
  email: string;
};

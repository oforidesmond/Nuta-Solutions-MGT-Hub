export type DateRangePreset = "today" | "this_week" | "this_month" | "custom";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format local date as YYYY-MM-DD (API query). */
export function toYyyyMmDd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export function startOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function endOfMonth(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export interface DateRangeStrings {
  startDate: string;
  endDate: string;
}

export function rangeForPreset(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string,
  now: Date = new Date(),
): DateRangeStrings {
  if (preset === "custom" && customStart && customEnd) {
    return { startDate: customStart, endDate: customEnd };
  }
  const today = toYyyyMmDd(now);
  if (preset === "today") {
    return { startDate: today, endDate: today };
  }
  if (preset === "this_week") {
    const start = startOfWeekMonday(now);
    return { startDate: toYyyyMmDd(start), endDate: today };
  }
  if (preset === "this_month") {
    return { startDate: toYyyyMmDd(startOfMonth(now)), endDate: toYyyyMmDd(endOfMonth(now)) };
  }
  return { startDate: today, endDate: today };
}

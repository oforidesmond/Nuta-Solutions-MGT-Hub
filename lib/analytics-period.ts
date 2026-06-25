import type { OrgAnalyticsPeriod } from "@/lib/api/analytics-org";
import type { DateRangePreset } from "@/lib/date-range-presets";
import { rangeForPreset } from "@/lib/date-range-presets";
import type { StaffReportPeriod } from "@/lib/types/reports";

/** Map date-range preset to closest org analytics period (for cross-surface consistency). */
export function datePresetToOrgPeriod(preset: DateRangePreset): OrgAnalyticsPeriod {
  switch (preset) {
    case "today":
      return "today";
    case "this_week":
      return "week";
    case "this_month":
      return "month";
    case "custom":
    default:
      return "month";
  }
}

/** Derive staff-performance API period from a date range (days span). */
export function dateRangeToStaffPeriod(startDate: string, endDate: string): StaffReportPeriod {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const days = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (days <= 7) return "7d";
  if (days <= 30) return "30d";
  if (days <= 90) return "90d";
  return "this_month";
}

export function rangeFromPreset(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string,
): { startDate: string; endDate: string } {
  return rangeForPreset(preset, customStart, customEnd);
}

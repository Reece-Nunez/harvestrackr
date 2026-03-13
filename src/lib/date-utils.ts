import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subYears, format } from "date-fns";

export type DateRangePreset = "this_month" | "last_month" | "this_quarter" | "this_year" | "last_year" | "custom";

export interface DateRange {
  startDate: string;
  endDate: string;
}

export function getDateRangeFromPreset(preset: DateRangePreset, customStart?: string, customEnd?: string): DateRange {
  const now = new Date();

  switch (preset) {
    case "this_month":
      return {
        startDate: format(startOfMonth(now), "yyyy-MM-dd"),
        endDate: format(endOfMonth(now), "yyyy-MM-dd"),
      };
    case "last_month":
      const lastMonth = subMonths(now, 1);
      return {
        startDate: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
        endDate: format(endOfMonth(lastMonth), "yyyy-MM-dd"),
      };
    case "this_quarter":
      return {
        startDate: format(startOfQuarter(now), "yyyy-MM-dd"),
        endDate: format(endOfQuarter(now), "yyyy-MM-dd"),
      };
    case "this_year":
      return {
        startDate: format(startOfYear(now), "yyyy-MM-dd"),
        endDate: format(endOfYear(now), "yyyy-MM-dd"),
      };
    case "last_year": {
      const lastYear = subYears(now, 1);
      return {
        startDate: format(startOfYear(lastYear), "yyyy-MM-dd"),
        endDate: format(endOfYear(lastYear), "yyyy-MM-dd"),
      };
    }
    case "custom":
      return {
        startDate: customStart || format(startOfMonth(now), "yyyy-MM-dd"),
        endDate: customEnd || format(endOfMonth(now), "yyyy-MM-dd"),
      };
    default:
      return {
        startDate: format(startOfMonth(now), "yyyy-MM-dd"),
        endDate: format(endOfMonth(now), "yyyy-MM-dd"),
      };
  }
}

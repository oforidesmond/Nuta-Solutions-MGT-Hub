export type RevenueTrendPeriod = "daily" | "weekly" | "monthly";
export type StaffReportPeriod = "7d" | "30d" | "90d" | "this_month";

export interface ReportSalesSummaryParams {
  startDate: string;
  endDate: string;
}

export interface ReportStaffPerformanceParams {
  period: StaffReportPeriod;
}

export interface ReportRevenueTrendsParams {
  period: RevenueTrendPeriod;
}

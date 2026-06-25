function sanitizeSegment(value: string): string {
  return value
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function buildExportFilename({
  orgName,
  reportType,
  from,
  to,
  suffix = "csv",
}: {
  orgName: string;
  reportType: string;
  from?: string;
  to?: string;
  suffix?: string;
}): string {
  const org = sanitizeSegment(orgName) || "export";
  const type = sanitizeSegment(reportType) || "report";
  const range =
    from && to ? `${sanitizeSegment(from)}_${sanitizeSegment(to)}` : new Date().toISOString().slice(0, 10);
  return `${org}-${type}-${range}.${suffix}`;
}

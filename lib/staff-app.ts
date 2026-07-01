/** Server: full blob URL after APK upload. Client: use `isStaffAppDownloadConfigured()` via page props. */
export const STAFF_APP_BLOB_URL_ENV = "STAFF_APP_BLOB_URL";

/** Server-only Vercel Blob token for `head()` / upload scripts. */
export const BLOB_READ_WRITE_TOKEN_ENV = "BLOB_READ_WRITE_TOKEN";

export const STAFF_APP_APK_FILENAME = "nutapos-staff.apk";

export function isStaffAppDownloadConfigured(): boolean {
  return Boolean(process.env[STAFF_APP_BLOB_URL_ENV]?.trim());
}

export function staffAppDownloadPath(orgId?: string | null): string {
  const base = "/api/staff-app/download";
  if (!orgId?.trim()) return base;
  return `${base}?org=${encodeURIComponent(orgId.trim())}`;
}

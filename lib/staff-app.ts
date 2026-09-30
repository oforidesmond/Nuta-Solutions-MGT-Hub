import { getApiBaseUrl } from "@/lib/constants";

/** Nest public path (relative to `NEXT_PUBLIC_API_URL` / `/api/v1`). */
export const STAFF_APP_UPDATE_PATH = "/staff-app/update";

/** Nest public download path (relative to `NEXT_PUBLIC_API_URL` / `/api/v1`). */
export const STAFF_APP_DOWNLOAD_PATH = "/staff-app/download";

export type StaffAppUpdateInfo = {
  versionName: string;
  versionCode: number;
  apkFilename: string;
  downloadUrl: string;
};

/** Absolute Nest download URL for the current Staff APK release. */
export function staffAppNestDownloadUrl(): string {
  const base = getApiBaseUrl().replace(/\/+$/, "");
  return `${base}${STAFF_APP_DOWNLOAD_PATH}`;
}

/**
 * Public availability / version check (no Bearer).
 * Returns null when no current release (404), Nest misconfigured (503), or network failure.
 */
export async function fetchStaffAppUpdate(): Promise<StaffAppUpdateInfo | null> {
  const base = getApiBaseUrl().replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}${STAFF_APP_UPDATE_PATH}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.status === 404 || res.status === 503) return null;
    if (!res.ok) return null;
    const data = (await res.json()) as StaffAppUpdateInfo;
    if (!data?.downloadUrl?.trim() && !data?.versionName) return null;
    return {
      versionName: data.versionName,
      versionCode: data.versionCode,
      apkFilename: data.apkFilename,
      downloadUrl: data.downloadUrl?.trim() || staffAppNestDownloadUrl(),
    };
  } catch {
    return null;
  }
}

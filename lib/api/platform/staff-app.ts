import axios from "axios";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import {
  platformGet,
  platformPost,
  unwrapPaginated,
} from "@/lib/api/platform/_pagination";
import type {
  PlatformStaffAppRelease,
  RegisterStaffAppReleaseDto,
} from "@/lib/types/platform";

export async function fetchCurrentStaffAppRelease(): Promise<PlatformStaffAppRelease | null> {
  try {
    return await platformGet<PlatformStaffAppRelease>(
      endpoints.platform.staffAppReleaseCurrent,
    );
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}

export async function fetchStaffAppReleases(): Promise<PlatformStaffAppRelease[]> {
  const raw = await platformGet<unknown>(endpoints.platform.staffAppReleases);
  if (Array.isArray(raw)) return raw as PlatformStaffAppRelease[];
  return unwrapPaginated<PlatformStaffAppRelease>(raw).data;
}

export async function publishStaffAppRelease(input: {
  versionName: string;
  versionCode: number;
  file: File;
}): Promise<PlatformStaffAppRelease> {
  const form = new FormData();
  form.append("versionName", input.versionName.trim());
  form.append("versionCode", String(input.versionCode));
  form.append("file", input.file);

  const res = await api.post<PlatformStaffAppRelease>(
    endpoints.platform.staffAppReleases,
    form,
    {
      // Drop the instance default `application/json` so the browser sets multipart boundary.
      headers: { "Content-Type": undefined },
    },
  );
  return res.data;
}

export async function registerStaffAppRelease(
  dto: RegisterStaffAppReleaseDto,
): Promise<PlatformStaffAppRelease> {
  return platformPost<PlatformStaffAppRelease>(
    endpoints.platform.staffAppReleaseRegister,
    {
      versionName: dto.versionName.trim(),
      versionCode: dto.versionCode,
      blobUrl: dto.blobUrl.trim(),
      ...(dto.apkFilename?.trim()
        ? { apkFilename: dto.apkFilename.trim() }
        : {}),
    },
  );
}

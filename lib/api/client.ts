import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { getApiBaseUrl } from "@/lib/constants";
import { refreshAccessToken } from "@/lib/api/refresh-access";
import { useAuthStore } from "@/stores/auth-store";

export const BRANCH_FORBIDDEN_FLAG = "isBranchForbidden";

type HubAxiosRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _branchRetry?: boolean;
};

function isAuthRoute(url: string): boolean {
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/signup") ||
    url.includes("/auth/staff/login")
  );
}

/** Routes that resolve branches from the request body / roll up all branches. */
function isBranchAgnosticRoute(url: string): boolean {
  return url.includes("/inventory/transfer") || url.includes("/analytics/org/");
}

function attachBranchHeader(config: InternalAxiosRequestConfig): void {
  const url = config.url ?? "";
  if (isAuthRoute(url) || url.includes("/platform/")) return;
  if (isBranchAgnosticRoute(url)) return;

  // Respect an explicit per-request override (e.g. fetching stock for a
  // specific branch in the transfer flow); otherwise use the active branch.
  if (config.headers["X-Branch-Id"]) return;

  const { activeBranchId } = useAuthStore.getState();
  if (activeBranchId) {
    config.headers["X-Branch-Id"] = activeBranchId;
  }
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  const auth = useAuthStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  /** Same tenant as `/users/me` + JWT org scope - must match Platform org routes (no default-org fallback). */
  const tenantId = auth.organization?.id ?? auth.user?.organizationId;
  if (tenantId && !config.headers["X-Tenant-ID"]) {
    config.headers["X-Tenant-ID"] = tenantId;
  }
  attachBranchHeader(config);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as HubAxiosRequestConfig | undefined;
    if (!original) return Promise.reject(error);

    const sentBranchId = original.headers?.["X-Branch-Id"];
    const status = error.response?.status;

    if (
      status === 404 &&
      sentBranchId &&
      !original._branchRetry
    ) {
      const { defaultBranchId } = useAuthStore.getState();
      if (defaultBranchId && defaultBranchId !== sentBranchId) {
        original._branchRetry = true;
        useAuthStore.getState().setActiveBranch(defaultBranchId);
        original.headers["X-Branch-Id"] = defaultBranchId;
        return api(original);
      }
    }

    if (status === 403 && sentBranchId) {
      const branchError = error as AxiosError & {
        [BRANCH_FORBIDDEN_FLAG]?: boolean;
      };
      branchError[BRANCH_FORBIDDEN_FLAG] = true;
      return Promise.reject(branchError);
    }

    if (original._retry) return Promise.reject(error);
    const url = original.url ?? "";
    if (url.includes("/auth/refresh") || url.includes("/auth/login")) {
      return Promise.reject(error);
    }
    if (status !== 401) return Promise.reject(error);

    original._retry = true;
    const next = await refreshAccessToken();
    if (!next) {
      useAuthStore.getState().clearSession();
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/change-password") &&
        !window.location.pathname.startsWith("/auth/callback")
      ) {
        window.location.assign("/login");
      }
      return Promise.reject(error);
    }
    original.headers.Authorization = `Bearer ${next}`;
    return api(original);
  },
);

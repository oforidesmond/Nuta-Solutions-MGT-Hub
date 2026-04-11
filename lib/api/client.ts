import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { getApiBaseUrl } from "@/lib/constants";
import { refreshAccessToken } from "@/lib/api/refresh-access";
import { useAuthStore } from "@/stores/auth-store";

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    if (!original || original._retry) return Promise.reject(error);
    const url = original.url ?? "";
    if (url.includes("/auth/refresh") || url.includes("/auth/login")) {
      return Promise.reject(error);
    }
    if (error.response?.status !== 401) return Promise.reject(error);

    original._retry = true;
    const next = await refreshAccessToken();
    if (!next) {
      useAuthStore.getState().clearSession();
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login") &&
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

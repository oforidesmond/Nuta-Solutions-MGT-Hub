import axios from "axios";
import { getApiBaseUrl } from "@/lib/constants";

/** No auth interceptors - used for refresh and login. */
export const bareApi = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { "Content-Type": "application/json" },
});

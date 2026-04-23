import axios from "axios";

export function reliabilityListHttpMessage(resourceLabel: string, path: string, e: unknown): string {
  if (!axios.isAxiosError(e) || !e.response) return `Could not load ${resourceLabel}.`;
  const s = e.response.status;
  if (s === 403) {
    return `You do not have access to ${path}. Use an organisation admin or manager account.`;
  }
  if (s === 404) {
    return `${path} returned 404. Check NEXT_PUBLIC_API_URL and that this route is deployed on the API.`;
  }
  return `Could not load ${resourceLabel}.`;
}

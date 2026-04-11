# NutaPOS Hub — Nest & Astro integration

This document describes how the Next.js Management Hub (`npm run dev` on port **5174**), the Astro marketing site (**4321**), and the Nest API (**3000**) work together.

## Why handoff codes exist

`localStorage` is **per origin**. A refresh token stored on `http://localhost:4321` is **not visible** to `http://localhost:5174`. After signup, the marketing app must not assume the Hub can read its storage.

## Recommended flow

1. **Astro:** `POST /auth/signup` → receives `accessToken`, `refreshToken`, `user`.
2. **Astro:** Immediately `POST /auth/handoff` with `{ "refreshToken": "<from signup>" }` (or server-issued session id).
3. **Nest:** Creates a **short-lived, single-use** code (TTL e.g. 60–120s), stores it server-side, returns `{ "code": "...", "expiresInSeconds": 90 }`.
4. **Astro:** Redirects the **same tab**:  
   `window.location.assign("http://localhost:5174/auth/callback?code=" + encodeURIComponent(code))`
5. **Hub:** `POST /auth/handoff/consume` with `{ "code": "<from query>" }`.
6. **Nest:** Returns `{ accessToken, refreshToken, user, organization? }` (snake_case variants optional if documented).
7. **Hub:** Persists **only** `refreshToken` in `localStorage` under key `nutapos_hub_refresh_token`. Keeps `accessToken` **in memory** (Zustand).

## Hub environment

Copy `.env.local.example` to `.env.local`:

- `NEXT_PUBLIC_API_URL` — Nest base URL (e.g. `http://localhost:3000`).
- `NEXT_PUBLIC_HUB_URL` — Hub public URL (e.g. `http://localhost:5174`) for documentation and deep links.

## Nest endpoints the Hub calls

| Method | Path | Notes |
|--------|------|--------|
| POST | `/auth/refresh` | Body `{ refreshToken }` (or align with existing DTO). |
| POST | `/auth/login` | Email/password; same token shape as signup. |
| POST | `/auth/handoff` | Mint code (Astro-only, or shared). |
| POST | `/auth/handoff/consume` | Exchange code for tokens + user. |
| GET | `/users/me` | JWT org scope; may return nested `organization`. |
| GET | `/organizations/:id` | Used when `me` has `organizationId` but no embedded org. |
| GET | `/products`, `/sales`, `/users` | Expected org-scoped by JWT. |
| POST | `/users/staff` | MVP “add staff”; adjust path/DTO to match Nest. |
| PATCH | `/organizations/:id` | Settings save. |
| GET | `/dashboard/summary` | Optional; Hub falls back to aggregating products + sales if **404**. |

All paths are centralized in `lib/api/endpoints.ts` for easy alignment when controllers differ.

## Security notes

- Do not persist `accessToken` in `localStorage` or session cookies from JS unless you deliberately change the threat model.
- Rate-limit `handoff` and `handoff/consume`; invalidate code after first successful consume.

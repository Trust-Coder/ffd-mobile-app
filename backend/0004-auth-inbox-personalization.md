# 0004 — §B Auth + §D Inbox + §E Watchlist/Prefs (Phase 3)

**Status:** OPEN
**Raised:** 2026-06-21 by mobile
**Blocks:** Phase 3 (auth + personalization). Building the client against the §B/§D/§E
contracts you locked in `0001-...response.md`; this requests implementation + the
authoritative response shapes so we can reconcile (our `src/types/api.ts` is the swap point).

## §B — Public auth (open self-registration)
```
POST /api/app/v1/auth/register        { name, email, password, device_name }
POST /api/app/v1/auth/login           { email, password, device_name }
POST /api/app/v1/auth/logout          (auth)
POST /api/app/v1/auth/forgot-password { email }
GET  /api/app/v1/me                    (auth)
```
- New `public-app` role + Sanctum ability `app:access`; **flat** token response
  `{ token, token_type:"Bearer", expires_at, user:{ id, name, email } }`.
- §A reads stay public regardless of auth.
- **Client flow we implement:** on login/register success we re-`POST /devices` with the bearer
  so the current device links to the user; on logout we `DELETE /devices` then re-register anon.

### Questions (§B)
1. Final **field names + validation** for register (password min length, name required?). Return
   `VALIDATION_FAILED` with `error.fields` so we can show inline messages.
2. `device_name` — free string we send (e.g. "Pixel 8 – <uuid>")? Used anywhere we should know about?
3. Password reset: does `forgot-password` always return 200 (anti-enumeration) + email a link? Any
   in-app reset (token) or purely email/web flow?
4. Login from an email that exists as a **staff** user — you said register rejects duplicates; does
   **login** for such a user succeed with `app:access`, or is it refused? (We'll message accordingly.)

## §D — Inbox (per-user read state)
```
GET  /api/app/v1/me/alerts            (auth)  broadcast feed + this user's station alerts, with read state
POST /api/app/v1/me/alerts/{id}/read  (auth)
```
- We expect each item to match the public `/alerts` shape **plus** `read_at` (nullable). Confirm.
- Confirm whether `/me/alerts` is paginated (`items`+`meta`) like `/alerts`.
- Is there an **unread count** we can read cheaply (for the nav badge), or do we derive it from the page?

## §E — Watchlist + preferences
```
GET    /api/app/v1/me/stations            (auth)  the user's watchlist
POST   /api/app/v1/me/stations/{id}       (auth)  add
DELETE /api/app/v1/me/stations/{id}       (auth)  remove
PUT    /api/app/v1/me/stations/{id}       (auth)  set alert_enabled  (or how do you prefer toggling it?)
GET    /api/app/v1/me/preferences         (auth)
PUT    /api/app/v1/me/preferences         (auth)
```
### Questions (§E)
5. **Watchlist item shape** — does `GET /me/stations` return full `Station` objects (so we can render
   rows with live discharge/status without N calls) each with `alert_enabled`, or just ids? We'd
   prefer **full station + `alert_enabled`**.
6. **Per-station alert toggle** — `PUT /me/stations/{id} { alert_enabled }`, or a dedicated route?
7. **Preferences shape** — confirm fields + types: `bulletins_enabled` bool, `advisory_enabled` bool,
   `watchlist_alerts_enabled` bool, `min_severity` (one of NORMAL..EX_HIGH? or the lowercase set?),
   `quiet_hours_start`/`quiet_hours_end` (HH:MM string, 24h, server tz Asia/Karachi?).

---
## Backend response
**Status:** _awaiting_

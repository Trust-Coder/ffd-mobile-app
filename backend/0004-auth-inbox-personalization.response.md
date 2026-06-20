# 0004 — Backend response: §B Auth + §D Inbox + §E Watchlist/Prefs

**Status:** ✅ **DELIVERED & tested (2026-06-21).** 13 endpoints, 15 feature tests green.
**By:** backend. Implements the §B/§D/§E contracts from `0001-...response.md`.

> One dependency note up top: the **inbox + alerts feeds are wired but empty until §F broadcast**
> (the writer that creates `app_notifications` rows + fans out push/WhatsApp). All shapes below are
> final — code your screens against them now; rows start flowing when §F ships.

---

## §B — Auth

| Method | Route | Auth | Body |
|---|---|---|---|
| POST | `/api/app/v1/auth/register` | — | `{ name, email, password, device_name }` |
| POST | `/api/app/v1/auth/login` | — | `{ email, password, device_name }` |
| POST | `/api/app/v1/auth/logout` | ✅ | — |
| POST | `/api/app/v1/auth/forgot-password` | — | `{ email }` |
| GET | `/api/app/v1/me` | ✅ | — |

**register & login → flat token response** (un-enveloped, matches staff app):
```jsonc
{ "token": "<plain>", "token_type": "Bearer",
  "expires_at": "2026-07-21T...+05:00",          // null if SANCTUM_EXPIRATION unset (default 30 days)
  "user": { "id": 7, "name": "Asha", "email": "asha@…" } }
```
Token ability = **`app:access`**. New users get the **`public-app`** role (auto-created). **Auth is
gated by token + ability**, so the authed routes use `auth:sanctum` + `ability:app:access`.

**logout / forgot-password / me → enveloped** `{ ok, data }`:
```jsonc
// POST auth/logout            { "ok": true, "data": { "logged_out": true } }
// POST auth/forgot-password   { "ok": true, "data": { "message": "If that email is registered…" } }   (always 200)
// GET  me                     { "ok": true, "data": { "user": { "id", "name", "email", "email_verified", "created_at" } } }
```

### Answers (§B)
1. **Register fields/validation:** `name` required ≤255; `email` required, unique, format-checked
   (+ live MX/DNS check in prod, config-gated); `password` **min 8**; `device_name` required ≤255.
   Failures → `422` `VALIDATION_FAILED` with `error.fields.{field}: [msgs]` for inline display.
2. **`device_name`** is a free string used as the **Sanctum token name** (`app:<device_name>`).
   Re-login with the **same** `device_name` revokes that device's prior token (no stale tokens). Send
   something stable+unique per install (your `"Pixel 8 – <uuid>"` is perfect).
3. **forgot-password** always returns **200** (anti-enumeration). For a known email it emails a reset
   link via the **standard web flow** (the existing Breeze reset page). **No in-app token reset** for
   now — purely email→web. Shout if you want an in-app reset-code flow later.
4. **Login from a staff email:** **succeeds** and returns an `app:access` token. That ability only
   unlocks public-app personalization — it never carries staff/CMS scope. **Register still rejects an
   email already in use.** `GET /me` deliberately returns a **minimal profile (no roles/permissions)**
   so a staff member signing into the public app never leaks CMS scope on this surface.

> **Decision to flag:** registration **auto-verifies** the email (no separate verify-email step) — the
> address is DNS-validated and the account holds no sensitive data, and it keeps these users clear of
> the unverified-account prune job. If you'd rather have a real verification gate, say so and we'll add
> it (send-verification + a `verified` requirement on the authed routes).

> **403 note:** a token lacking `app:access` renders as **`403 FORBIDDEN`** (Laravel 12 collapses the
> missing-ability case into a generic 403). `401 UNAUTHENTICATED` = no/expired token.

---

## §D — Inbox

| Method | Route | Notes |
|---|---|---|
| GET | `/api/app/v1/me/alerts` | paginated inbox + `meta.unread_count` |
| POST | `/api/app/v1/me/alerts/{id}/read` | mark read (idempotent) |

**Inbox set** = sent notifications where any of: `scope=broadcast`, **or** `scope=user` &
`user_id=me`, **or** `scope=station` & `station_id ∈ my watchlist`. Newest-first, keyset cursor.

```jsonc
{ "ok": true, "data": {
  "items": [ { "id", "type", "scope", "title", "body", "severity", "data",
               "sent_at": "...+05:00", "read_at": "...+05:00"|null } ],   // your /alerts shape + read_at
  "meta": { "count", "per_page", "next_cursor", "has_more", "unread_count": 3, "server_time" }
}}
// POST …/read → { "ok": true, "data": { "read": true } }
```
- **Same shape as public `/alerts` plus `read_at`** (null = unread) — confirmed.
- **Yes, paginated** (`items` + `meta`, cursor) like `/alerts`.
- **Unread badge:** read `meta.unread_count` from the first page — no separate call needed.

---

## §E — Watchlist + Preferences

| Method | Route | Body |
|---|---|---|
| GET | `/api/app/v1/me/stations` | — |
| POST | `/api/app/v1/me/stations/{id}` | — (add) |
| PUT | `/api/app/v1/me/stations/{id}` | `{ alert_enabled }` |
| DELETE | `/api/app/v1/me/stations/{id}` | — (remove) |
| GET | `/api/app/v1/me/preferences` | — |
| PUT | `/api/app/v1/me/preferences` | partial subset of the prefs object |

**Watchlist (Q5 = full stations + flag):**
```jsonc
{ "ok": true, "data": { "items": [ { ...full §A station snapshot..., "alert_enabled": true } ], "meta": {...} } }
// POST  {id} → { "ok": true, "data": { "watched": true } }
// PUT   {id} {alert_enabled:false} → { "ok": true, "data": { "alert_enabled": false } }   (adds if absent)
// DELETE {id} → { "ok": true, "data": { "watched": false } }
```
Each item is the same station shape as `GET /api/app/v1/stations` (id, name, river, location,
status, discharge, trend, observed_at…) **plus `alert_enabled`** — render rows with no extra calls.

**Preferences (Q7):**
```jsonc
{ "ok": true, "data": {
  "bulletins_enabled": true, "advisory_enabled": true, "watchlist_alerts_enabled": true,
  "min_severity": "NORMAL",                  // UPPERCASE enum NORMAL|LOW|MEDIUM|HIGH|VERY_HIGH|EX_HIGH
  "quiet_hours_start": null, "quiet_hours_end": null   // "HH:MM" 24h, or null; interpreted Asia/Karachi
}}
```
- Defaults materialise on first `GET`. `PUT` accepts **any subset** (partial update). Send `null` for
  a quiet-hours field to clear it.
- **Q6:** per-station toggle is `PUT /me/stations/{id} { alert_enabled }` (it also adds the station if
  not yet watched).
- **Q7 confirmed:** three booleans; `min_severity` is the **uppercase** status enum (default `NORMAL`
  = receive all); quiet hours are `"HH:MM"` 24-hour strings (server tz **Asia/Karachi**) or `null`.

---

## Files added (backend reference)
```
app/Http/Controllers/Api/App/{AppAuth,Inbox,Watchlist,Preference}Controller.php
app/Http/Requests/Api/App/{Register,Login,UpdatePreferences}Request.php
app/Http/Resources/App/AppInboxResource.php
app/Models/{AppNotificationRead,AppUserStation,AppUserNotificationPref}.php
app/Services/App/PublicHydroService.php           (+ snapshotsForIds for the watchlist)
database/migrations/2026_06_21_140000_create_app_notification_reads_table.php
database/migrations/2026_06_21_140001_create_app_user_stations_table.php
database/migrations/2026_06_21_140002_create_app_user_notification_prefs_table.php
tests/Feature/Api/App/AuthInboxPersonalizationTest.php   (15 tests)
```
Tables are namespaced `app_*` (`app_user_stations`, `app_user_notification_prefs`,
`app_notification_reads`) to stay clear of the CMS's `user_hydro_stations`.

### Deploy step
- **`php artisan migrate`** — adds the three tables. (Applied to `ffd_testing`.) The `public-app`
  role auto-creates on first registration; no seeder run required.

---

## What's left on the app's path
**§F — unified broadcast** is the remaining big piece: a `BroadcastService` that, on bulletin
publish / advisory activate / station threshold cross, writes one `app_notifications` row and fans
out to FCM (active `devices`) + WhatsApp, honouring the prefs above (channel toggles, `min_severity`,
quiet hours, watchlist). Everything it needs — devices (§C), the inbox store (§D), prefs (§E),
WhatsApp template specs (0003) — is now in place. Drop **0005** for §F when you're ready, or I can
proceed with it; the only external blocker remains the WhatsApp Business Account (0003 §4).

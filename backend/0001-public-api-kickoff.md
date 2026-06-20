# 0001 — Public app API surface: read, auth, devices, inbox, broadcast

**Status:** OPEN
**Raised:** 2026-06-21 by mobile
**Blocks:** the whole app (Phases 1–4 in `docs/FFD-App-WorkPlan.md`). Phase 1 needs only §A.

> **Client note (2026-06-21):** the app is being built **against the proposed contract below**
> so client work isn't blocked. `src/types/api.ts` is the single swap point — when you mark a
> section DELIVERED with the real shapes, we reconcile types + endpoints there. Please fill the
> **Backend response** section per-section (§A first) and flag any field/route deviations
> explicitly so we know exactly what to change.

## Context

We are building the **public FFD flood app** (Capacitor + React) — a separate client repo
at `E:\Websites\ffd-mobile-app`. It lets the general public view latest hydro data, FFD
bulletins, the active flood advisory, and an alerts inbox; lets registered users curate a
station watchlist; and receives FCM push, with every published message fanning out to
**push + in-app inbox + WhatsApp** in one action.

This is a **new, fourth API surface** distinct from `/api/mobile` (staff, permission-gated)
and `/api/dss/v1` (machine-to-machine, keyed). We can't reuse those: DSS keys can't ship in
a public client, and staff auth rejects public users. We propose **`/api/app/v1/*`**.

Full client-side analysis: `../docs/BACKEND-INTEGRATION.md`.

## What already exists (please reuse — confirm our understanding)

- **`app/Services/Push/FcmService.php`** — FCM HTTP v1 sender, OAuth2-from-service-account,
  per-token send, Android `channel_id` / iOS `sound`, **reactive dead-token pruning**. Config
  `services.fcm.credentials` ← `FCM_CREDENTIALS`. → We do **not** need a new FCM sender.
- **`PushToken` + `Api/Mobile/PushTokenController`** — but `user_id` is **required**. We need
  anonymous tokens (`user_id` nullable) + `last_seen_at`.
- **Threshold state machine** (`HydroSubmissionWriter` + `HydroThresholdState`) →
  **`SendHydroThresholdAlertsJob`** already fires on band escalation, but to a **staff** audience
  (`HydroPushAudience`). We need a public-audience path on the same trigger — not new detection.
- **Data/content:** `HydroStation`, `LatestHydroStationReading`, `RiverFlowReading`,
  `HydroPeakLevel` (status thresholds), `Bulletin` (+ advisory), `HydroSituationReport`.
- **Subscription fan-out pattern:** `AlertSubscriptionService`, `HydroSubscription`,
  `BulletinSubscription`.

Everything below follows the existing envelope: `{ ok, data }` / `{ ok, error:{ code, message, fields } }`.

---

## The ask — proposed contract (adjust freely; these are our defaults)

### §A. Public read (no auth) — **unblocks Phase 1, please prioritise**
```
GET /api/app/v1/flows/latest                 latest reading per station
GET /api/app/v1/stations                     list (name, river, location, latest value, status)
GET /api/app/v1/stations/{id}                detail + recent series for the 24h chart (+ threshold lines)
GET /api/app/v1/bulletins?river=&severity=&since=     feed
GET /api/app/v1/bulletins/{id}               detail (+ download_url for the PDF/Word file)
GET /api/app/v1/advisory/active              the one active advisory, or null (drives the Home card)
GET /api/app/v1/advisories  ·  /advisories/{id}       history + detail
GET /api/app/v1/alerts                       public alerts feed (broadcast-scope notifications, paginated)
```
- Reshape existing data; **do not** touch ingestion pipelines.
- Include the **6-level** `status` enum (`NORMAL…EX_HIGH`) + numeric thresholds so the client can
  draw Medium/High lines. Send ISO 8601 **with offset**.
- Station series: a Plotly-ready shape (like `/api/mobile` `…/series`) is fine, or raw
  `{x[],y[]}` — your call; tell us which.

### §B. Public auth — open self-registration
```
POST /api/app/v1/auth/register   { name, email, password, device_name }
POST /api/app/v1/auth/login      { email, password, device_name }
POST /api/app/v1/auth/logout
POST /api/app/v1/auth/forgot-password
GET  /api/app/v1/me
```
- Creates a **low-privilege public user** (new role e.g. `public-app` / or a flag) — **not**
  `use-hydro-feed-app`. Sanctum token, flat token response like the staff app.
- Read endpoints in §A stay public regardless of auth.

### §C. Devices (no auth required — anonymous tokens allowed)
```
POST   /api/app/v1/devices            { fcm_token, platform, app_version }  upsert on token, last_seen_at=now, link user if authed
POST   /api/app/v1/devices/heartbeat  { fcm_token }  bump last_seen_at
DELETE /api/app/v1/devices            { fcm_token }  explicit unsubscribe
```
- Either extend `push_tokens` (nullable `user_id`, add `platform`, `app_version`, `last_seen_at`)
  or add a `devices` table per the work plan — your call; we just need anonymous tokens + heartbeat.
- **Active device** = `last_seen_at >= now() - N days` (default **N=30**, config-driven). Daily prune job.

### §D. Notifications inbox (canonical message store)
```
GET  /api/app/v1/me/alerts            authed inbox = broadcast feed + this user's station alerts, with read state
POST /api/app/v1/me/alerts/{id}/read  mark read
```
- `notifications` row is the **source of truth** for the inbox; a push is just one delivery channel
  for the same row. Fields per work plan §3: `type`, `scope`, `user_id?`, `title`, `body`,
  `severity`, `data` (json: advisory_id/bulletin_id/station_id + deeplink), `channels` (json),
  `sent_at`. Plus `notification_reads` (`notification_id`, `user_id?`, `device_id?`, `read_at`).

### §E. Watchlist + preferences (authed)
```
GET/PUT   /api/app/v1/me/stations          ·  POST/DELETE /me/stations/{id}
GET/PUT   /api/app/v1/me/preferences
```
- `user_stations` (`user_id`, `station_id`, `alert_enabled`); `user_notification_prefs`
  (`bulletins_enabled`, `advisory_enabled`, `watchlist_alerts_enabled`, `min_severity`,
  `quiet_hours_start`, `quiet_hours_end`).

### §F. Unified broadcast fan-out
- A single `BroadcastService::send($publishable)` that, in one path: (1) writes the `notifications`
  row, (2) pushes via `FcmService` to the **active public audience** (topic or token-batched),
  (3) posts to **WhatsApp** — recording which channels fired in `notifications.channels`; a failure
  in one channel must not block the others.
- **Auto-triggered** (no manual send) on: **bulletin publish**, **advisory activate**, **station
  threshold cross** (extend the existing `SendHydroThresholdAlertsJob` trigger to add the public
  audience). Honour active-only targeting + per-user prefs (severity, quiet hours, watchlist).

### §G. WhatsApp + FCM enhancements
- WhatsApp Business/Cloud API: creds + **pre-approved templates** (lead time — flag early).
- (Optional) FCM **topic** messaging (`bulletins`, `advisory`, `river_chenab`…) so broadcast
  doesn't loop per-token. Current `FcmService` is per-token only.

---

## Open questions for backend (decisions we can't make from our side)

1. **Namespace:** OK with `/api/app/v1`? Or fold the public app into `/api/mobile` with a new app id?
2. **Advisory "active":** how is *the one active advisory* represented today — `Bulletin type=advisory`
   with a status/`valid_until`, the `Warning` model, or something else? What drives `advisory/active`?
3. **Public user model:** new role/guard vs. a flag on `users`? Any conflict with staff `users` rows
   sharing an email?
4. **Bulletin severity:** does `bulletins` carry a `severity` we can filter/colour by, or must one be added?
5. **Devices table:** extend `push_tokens`, or new `devices` table? (Affects how broadcast resolves audience.)
6. **Rate limits / abuse:** what protection do you want on public read + register/login (e.g. throttle, captcha)?
7. **Station series shape:** Plotly traces+layout (reuse existing) or raw arrays?

---
## Backend response  (filled in by the backend side)
**Status:** _awaiting_

<!-- Backend agent: record the shipped contract here — final routes, controllers/migrations added,
     any deviations from the proposal above, and migration/seed steps the client should know about. -->

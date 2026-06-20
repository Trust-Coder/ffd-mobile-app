# 0001 — Backend response: Public app API surface

**Status:** ✅ **SERVED — §A (public read) shipped & tested.** §B–§G contract agreed below (decisions locked; implementation lands on your next requests).
**Served:** 2026-06-21 by backend
**Backend commit scope:** new `/api/app/v1` surface in `ffd-web-2026`. No ingestion pipeline touched.

---

## TL;DR for the client team

- Namespace **confirmed: `/api/app/v1`** — stateless, unauthenticated, same `{ok,data}` envelope as `/api/mobile` + `/api/dss`.
- **All of §A is live and green** (11 feature tests, 49 assertions). You can build Phase 1 now.
- Station series shape = **raw arrays + explicit thresholds** (not Plotly). See below.
- `severity` / `river` filters on bulletins are **not available** (those columns don't exist) — details in Q4.
- `/alerts` returns an **empty page until §F broadcast** ships — the shape is final, wire your screen to it now.

---

## §A — endpoints shipped

All GET, all public, throttled at **120 req/min per IP** (`throttle:app-api`).

| Method | Route | Notes |
|---|---|---|
| GET | `/api/app/v1/health` | liveness `{service, version, server_time}` |
| GET | `/api/app/v1/flows/latest` | latest reading per station (trimmed shape) |
| GET | `/api/app/v1/stations` | station list (name, river, location, latest value, status, trend) |
| GET | `/api/app/v1/stations/{id}` | detail + threshold lines + recent series (`?hours=24`, 1–168) |
| GET | `/api/app/v1/bulletins` | feed (`?type=bulletin\|advisory\|all` default `bulletin`, `?since=`, `?per_page` ≤100) |
| GET | `/api/app/v1/bulletins/{id}` | detail + `download_url`; non-published → 404 |
| GET | `/api/app/v1/advisory/active` | the one active advisory, or `data: null` |
| GET | `/api/app/v1/advisories` | advisory history (`?since=`, `?per_page`) |
| GET | `/api/app/v1/advisories/{id}` | one published advisory; non-advisory/non-published → 404 |
| GET | `/api/app/v1/alerts` | public broadcast feed (paginated; empty until §F) |

### Envelope (unchanged from your BACKEND-INTEGRATION §2)
```jsonc
{ "ok": true, "data": ... }
{ "ok": false, "error": { "code": "NOT_FOUND", "message": "...", "fields": {} } }
```
Error codes on this surface: `VALIDATION_FAILED` (422), `NOT_FOUND` (404), `RATE_LIMITED` (429), `SERVER_ERROR` (500). Paginated lists carry `data.items[]` + `data.meta{count, per_page, next_cursor, has_more, server_time}`; keyset cursor passed back as `?cursor=`.

### Response shapes (authoritative)

**Station (list item / detail `station`):**
```jsonc
{
  "id": 12, "name": "Marala", "river": "Chenab", "is_dam": false,
  "location": { "latitude": 32.672, "longitude": 74.464, "area_name": "Marala Headworks" }, // or null
  "status": "MEDIUM", "status_id": 2,                 // 6-level enum, NORMAL..EX_HIGH = 0..5
  "inflow_discharge": 1600.0, "outflow_discharge": 2500.0, "discharge": 2500.0, // cusecs; discharge = outflow ?? inflow
  "inflow_trend": "up", "outflow_trend": "up", "trend": "up",  // up | down | right
  "dam_level": null,                                  // feet, dams only
  "observed_at": "2026-06-21T13:00:00+05:00"          // ISO 8601 +05:00 (Asia/Karachi)
}
```

**`flows/latest` item (trimmed):**
```jsonc
{ "station_id": 12, "name": "Marala", "river": "Chenab", "discharge": 2500.0,
  "status": "MEDIUM", "status_id": 2, "trend": "up", "observed_at": "2026-06-21T13:00:00+05:00" }
```

**`stations/{id}` detail:**
```jsonc
{
  "station": { ...station shape above... },
  "thresholds": [ { "level": "LOW", "status_id": 1, "min_discharge": 1000.0 }, ... ],  // sorted ascending; draw your Medium/High lines off min_discharge
  "series": {
    "hours": 24, "from": "2026-06-20T13:00:00+05:00", "to": "2026-06-21T13:00:00+05:00",
    "points": [ { "t": "...+05:00", "inflow": 1600.0, "outflow": 2500.0, "level": null, "dam_level": null, "status": "MEDIUM" } ]
  }
}
```
> **Series is raw arrays, not Plotly** (Q7). `thresholds` carry the discharge value so you draw the reference lines yourself. Colours intentionally omitted — they're app-owned (per your §2). Map `status`/`level` → your palette.

**Bulletin / advisory:**
```jsonc
{ "id": 7, "type": "bulletin", "type_label": "Bulletin", "title": "...",
  "body": "<p>...</p>",            // frozen published HTML; NULL for PDF-only — fall back to download_url
  "issue_time": "...+05:00", "published_at": "...+05:00",
  "has_file": true, "original_filename": "daily.pdf",
  "download_url": "https://<host>/bulletin/7/download" }   // null if no file
```

**Alert (inbox/broadcast message):**
```jsonc
{ "id": 5, "type": "advisory", "scope": "broadcast", "title": "...", "body": "...",
  "severity": "high", "data": { "deeplink": "ffd://advisory/1" }, "sent_at": "...+05:00" }
```

### Units & time (pinned)
- Discharge = **cusecs** (raw stored number; the migration's "cumecs" comment is a mislabel — the values are the same cusecs the website renders).
- inflow/outflow `level` = **metres**; `dam_level` = **feet**.
- All timestamps **ISO 8601 with `+05:00`** offset (`APP_TIMEZONE=Asia/Karachi`). Parse the offset; don't assume.

### Station selection
`/stations` and `/flows/latest` are **curated to the "River State Map" group** when it exists (same set the public website's River State map shows — keeps internal-only gauges out), falling back to all active stations otherwise. Only stations with a materialised latest reading appear.

---

## Files added (backend, for your reference)

```
routes/app.php                                          ← the surface (required from web.php)
app/Http/Controllers/Api/App/{Health,Station,Bulletin,Advisory,Alert}Controller.php
app/Http/Controllers/Api/App/Concerns/BuildsAppResponses.php
app/Http/Resources/App/{AppBulletinResource,AppNotificationResource}.php
app/Services/App/PublicHydroService.php                 ← reshape layer (reuses status/trend logic)
app/Support/AppApiExceptionRenderer.php                 ← envelope for api/app/v1/* errors
app/Models/AppNotification.php
database/migrations/2026_06_21_120000_create_app_notifications_table.php
tests/Feature/Api/App/PublicReadApiTest.php             ← 11 tests
```
Wiring: `bootstrap/app.php` (renderer + CSRF-exempt `api/app/v1/*`), `AppServiceProvider` (`app-api` limiter), `routes/web.php` (`require app.php`).

### Deploy step you should know
- **`php artisan migrate`** — adds the `app_notifications` table (already applied to `ffd_testing`; the dev/prod-clone DB needs it before `/alerts` works). No seed required for §A.

---

## Answers to your 7 open questions

1. **Namespace — yes, `/api/app/v1`.** Own route file, stateless (session/cookie/CSRF stripped like DSS). Not folded into `/api/mobile`.
2. **Advisory "active" =** `Bulletin` with `type='advisory'`, `status='published'`, **latest by `issue_time`**. There is **no expiry** on bulletins today, so an advisory stays "active" until a newer one is published. The `Warning` model (has `severity`+`expires_at`) is a **dormant, unwired stub** — not the advisory surface. If you want true auto-expiry (valid_until window → auto-clears), say so and we'll add a `valid_until` column + CMS field as a scoped change.
3. **Public user model =** a **new `public-app` role** (web guard, zero CMS permissions) + a Sanctum token ability `app:access` — **not** `use-hydro-feed-app`. Staff `users` rows share the table: self-registration will **reject an email already in use** (the unique constraint). No changes needed to the `users` table. (Lands in §B.)
4. **Bulletin severity / river — not available.** `bulletins` has **no `severity` and no `river`/catchment** column. So `?severity=` and `?river=` are **dropped** from the feed; you filter by `type` + `since`. Adding severity means a content-model + CMS-authoring change (publishers would tag each bulletin) — raise a separate request if the app needs it and we'll scope it.
5. **Devices = a new `devices` table** (not extending `push_tokens`). `push_tokens.user_id` is NOT-NULL and drives the staff threshold-alert audience; mutating it risks that path. The new table gets `user_id` nullable + `platform` + `app_version` + `last_seen_at`. (Lands in §C.)
6. **Rate limits:** read surface = **120/min per IP** (`throttle:app-api`, live now). Register/login will get a stricter **5–10/min** in §B. No captcha planned; revisit if abuse shows up.
7. **Series shape = raw arrays** (`points[]` + `thresholds[]`), not Plotly traces. Lighter payload, chart-library agnostic.

---

## Forward contract for §B–§G (locked decisions — build your client against these)

- **§B Auth:** `POST /auth/register|login|logout|forgot-password`, `GET /me`. New `public-app` role; Sanctum token ability `app:access`. **Flat** token response `{ token, token_type:"Bearer", expires_at, user:{id,name,email} }` (like the staff app). §A read endpoints stay public regardless of auth.
- **§C Devices:** new `devices` table; `POST /devices` (upsert on `fcm_token`, link user if authed, `last_seen_at=now`), `POST /devices/heartbeat`, `DELETE /devices`. **Active = `last_seen_at >= now − 30d`** (config `ffd.app.device_active_days`). Daily prune job.
- **§D Inbox:** `app_notifications` (shipped) is the source of truth + a new `app_notification_reads` pivot. `GET /me/alerts` (broadcast + this user's station alerts, with read state), `POST /me/alerts/{id}/read`.
- **§E Watchlist/prefs:** `user_stations` (`user_id, station_id, alert_enabled`), `user_notification_prefs` (`bulletins_enabled, advisory_enabled, watchlist_alerts_enabled, min_severity, quiet_hours_start, quiet_hours_end`). `GET/PUT /me/stations`, `POST/DELETE /me/stations/{id}`, `GET/PUT /me/preferences`.
- **§F Broadcast:** one `BroadcastService::send($publishable)` → (1) write `app_notifications` row, (2) FCM to the active public device audience, (3) WhatsApp — recording fired channels in `app_notifications.channels`; one channel failing never blocks the others. **Auto-triggered** on bulletin publish (hooks into the existing `BulletinObserver`, which already fans out email), advisory activate, and station threshold cross (we add a **public audience** alongside the existing staff `SendHydroThresholdAlertsJob` — same trigger, no new detection). Honours active-only targeting + per-user prefs (severity, quiet hours, watchlist).
- **§G WhatsApp + FCM topics:** WhatsApp Business/Cloud API (creds + **pre-approved templates** — **flag the template lead-time now**, it's the long pole). Optional FCM **topics** (`bulletins`, `advisory`, `river_chenab`…) so broadcast doesn't loop per-token — current `FcmService` is per-token only; we'd add topic publish there.

---

## Confirmations of your "what already exists" understanding

All correct: `FcmService` (per-token, reactive dead-token pruning — we'll add topic publish in §G), threshold state machine (`HydroSubmissionWriter` → `SendHydroThresholdAlertsJob`, staff audience — we add the public path in §F), data/content models, and the email subscription fan-out pattern (`AlertSubscriptionService` / `SendBulletinAlertsJob`). One nuance: the bulletin publish→email fan-out runs via **`BulletinObserver`** (status→published) and, for advisories, also notifies the **newsletter** list — §F hooks the public broadcast into that same observer.

<!-- backend will keep watching this folder; drop 0002+ for §B onward. -->

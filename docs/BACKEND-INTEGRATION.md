# FFD Mobile App — Backend Integration Reference

This is the **client-side map of the backend**. The backend is a separate Laravel 12
project — it is the source of truth for everything below. This file records what we
(the mobile team) believe exists so we don't ask for things to be rebuilt, and pins
the conventions our client code must follow.

> **Backend repo:** `E:\Websites\ffd-web-2026` (FFD Web 2026 — Laravel 12 / PHP 8.2 / MySQL 8).
> We do **not** edit it. Backend changes are requested via [`../backend/`](../backend/README.md).

---

## 1. The three API surfaces that already exist

The backend already serves three distinct API families. **Ours is a fourth, new surface.**

| Surface | Prefix | Audience | Auth | Relevance to us |
|---|---|---|---|---|
| **Staff mobile** | `/api/mobile` | FFD operators/reviewers | Sanctum bearer, **permission-gated** (`use-hydro-feed-app`, `use-met-feed-app`) | Pattern reference only — *not* for public users. Reuse its conventions, auth controller shape, push-token flow. |
| **DSS sync** | `/api/dss/v1` | PakFlood-DSS modelling server (machine-to-machine) | Managed `dss_…` Bearer **API key**, scoped + rate-limited | Read-only data already exposed (river-flow, bulletins, etc.). **Cannot embed its key in a public app** (leak risk). Good schema reference. |
| **MDMS / catchment / meteogram** | `/api/mobile/mdms`, others | Staff | Sanctum | Not relevant. |
| **FFD public app (us)** | **`/api/app/v1`** | **General public** | Open: public read with no token; optional self-registration for personalization | **§A read LIVE** (shipped & tested); §B–G contract locked — see [`../backend/0001-public-api-kickoff.response.md`](../backend/0001-public-api-kickoff.response.md). |

**Why a new surface and not DSS:** DSS is keyed M2M with per-client rate limits and is
not meant for an untrusted, widely-distributed client. Our public reads must be
unauthenticated (or protected by a rotateable app-level mechanism), shaped for screens
(latest-per-station, recent series for a chart), not bulk sync.

---

## 2. Backend conventions our client MUST follow

### Response envelope (same as `/api/mobile` and `/api/dss`)
```jsonc
// success
{ "ok": true, "data": { ... } }
// failure
{ "ok": false, "error": { "code": "STRING_CODE", "message": "Friendly text", "fields": { ... } } }
```
- `fields` appears only on `VALIDATION_FAILED` (422), mapping input → array of messages.
- Validation failures also include native Laravel `message` + `errors` keys.
- Error codes seen across surfaces: `VALIDATION_FAILED` (422), `UNAUTHENTICATED` (401),
  `FORBIDDEN` (403), `NOT_FOUND` (404), `RATE_LIMITED` (429), `SERVER_ERROR` (500).
- Auth-token responses are **flat** (not enveloped) for backwards compatibility.
- Always send `Accept: application/json`. Sanctum bearer tokens; **stateless** (no cookies/CSRF).
- List/data endpoints paginate with **opaque keyset cursors** (`data.meta.next_cursor`),
  never page numbers. `per_page` max 1000, default 500 (DSS); confirm for our surface.

### Flood severity scale — backend is the source of truth
The report-card / status enum has **six** levels:
```
NORMAL | LOW | MEDIUM | HIGH | VERY_HIGH | EX_HIGH   (EX_HIGH = "Exceptionally High")
```
Resolved server-side from each station's configured thresholds (`hydro_peak_levels`).
The prototype UI collapses to **five** (Normal → Very High Flood). **Decision for our app:**
treat the backend enum as canonical; map `EX_HIGH` into the top visual bucket (or add a 6th
swatch). Trend/`change_text` is `Rising | Falling | No Significant Change`.

**Colours are owned by the app, not the backend.** Backend `status_color` values differ from
the prototype palette. Use our tokens (see §5 and the prototype), keyed off the backend `status` enum.

### Units
Discharge in **cusecs** (`Cs`); levels in metres; dam level in feet. Timestamps are ISO 8601
**with offset** — always parse the offset, never assume one. River-flow timestamps are Pakistan
local time (`Asia/Karachi`).

---

## 3. What already exists in the backend (REUSE — do not ask to rebuild)

### Push / FCM — already production-grade
- **`app/Services/Push/FcmService.php`** — full **FCM HTTP v1** sender. Mints the Google OAuth2
  token from a service-account JSON (signs the JWT with `openssl`, no SDK dependency), caches it,
  posts per-device messages, supports Android `channel_id` + iOS `sound`, and **reactively prunes
  dead tokens** on `UNREGISTERED` / `INVALID_ARGUMENT`. No-ops silently when unconfigured.
  - `sendToTokens(tokens, title, body, data, channelId?, sound?)`
  - `sendToUsers(userIds, …)` — resolves tokens via `PushToken`.
  - **Config:** `services.fcm.credentials` → `FCM_CREDENTIALS` env → path to `service-account.json`
    (default `storage_path('app/fcm/service-account.json')`).
  - **Gap for us:** it sends **per-token only** — no FCM *topic* messaging and no multicast batch.
    Broadcasts currently fan out token-by-token. Topics (`bulletins`, `advisory`, `river_chenab`…)
    would be an enhancement if broadcast volume grows.
- **`PushToken` model + `Api/Mobile/PushTokenController`** — `POST /api/mobile/push/register` /
  `/unregister`. **But `user_id` is required** (staff only). Our app needs **anonymous device
  tokens** (`user_id` nullable) + `last_seen_at` heartbeat — a gap to close.

### Flood-threshold auto-alerts — the "station crosses threshold" trigger already exists
- A **threshold state machine** lives in `HydroSubmissionWriter` + model `HydroThresholdState`.
  When a new reading escalates a station into a higher flood band it dispatches
  **`app/Jobs/SendHydroThresholdAlertsJob`** (queued, best-effort via `FcmService`).
- **But** it targets a **staff audience** (`HydroPushAudience::for([...staff perms...])`), not the
  public watchlist. The hook exists; our work is to **add a public audience path**, not build detection.
- Related jobs: `SendHydroSubmissionAlertJob`, `SendPushNotification`. Models: `HydroAlertDispatch`,
  `HydroAlertSnapshot`.

### Email subscription fan-out — the pattern to mirror for "single fan-out"
- `app/Services/AlertSubscriptionService.php`, models `HydroSubscription` / `BulletinSubscription`.
  These already do "publish → notify subscribers" by email. Our unified `BroadcastService`
  (push + inbox + WhatsApp) extends this idea to more channels.

### Hydro data + content (already populated, served by website + DSS)
- `HydroStation`, `HydroStationLocation`, `LatestHydroStationReading` (trigger-maintained latest
  per station — instant), `RiverFlowReading` (hourly, partitioned), `DamDailyReading`,
  `HydroPeakLevel` (flood thresholds → drives the `status` enum), `HydroStationForecast`,
  `HydroSituationReport` (daily situation report).
- **`Bulletin`** + `BulletinRevision` (Draft→Review→Approved→Published→Archived workflow), and
  **advisory** content (DSS exposes advisories as `type=advisory`; there is also a `Warning` model —
  the exact "active advisory" representation must be confirmed with backend, see kickoff request).
- Catchments/rivers: Indus, Jhelum, Chenab, Ravi, Sutlej.

### Auth machinery
- Laravel Sanctum (token), Spatie permissions, Breeze. Social login (`/api/mobile/auth/social`,
  Google/Yahoo native-SDK token exchange) exists for staff. **Public self-registration is a new
  concept** — current mobile auth requires a staff app permission and will reject public users.

---

## 4. Gap analysis — what is genuinely NEW (the ask to the backend)

Tracked in [`../backend/0001-public-api-kickoff.md`](../backend/0001-public-api-kickoff.md); the
authoritative shipped/agreed contract is [`../backend/0001-public-api-kickoff.response.md`](../backend/0001-public-api-kickoff.response.md).
`src/types/api.ts` mirrors the shipped §A shapes. Key facts that differ from our first proposal:
station `location` is an **object** `{latitude,longitude,area_name}`; `/flows/latest` items key on
`station_id` (not `id`); `stations/{id}` is **nested** `{station, thresholds[], series{points[]}}`;
**bulletins have no `severity`/`river`** (filters dropped); an **advisory is a `type='advisory'`
bulletin** with no expiry; alert `severity` is **lowercase** with an `ffd://type/id` deeplink.

| # | New thing | Notes |
|---|---|---|
| 1 | **Public read API** `/api/app/v1/*` | ✅ **SHIPPED** — flows-latest, stations list/detail/series, bulletins feed/detail, advisory active + history, public alerts feed (empty until §F). 120 req/min/IP. |
| 2 | **Public auth** | ✅ **SHIPPED** (§B, 0004) — `public-app` role + `app:access` ability; register/login (flat token), logout/forgot-password/me (enveloped; `/me` = `{data:{user}}`). Auto-verifies email. |
| 3 | **Anonymous device tokens** | ✅ **SHIPPED** (§C, backend/0002) — new `devices` table; `POST /devices` (returns `device_id`+`active`), `/devices/heartbeat` (`updated:false` ⇒ re-register), `DELETE /devices`; active=30d; daily `app:prune-devices`. |
| 4 | **Notifications inbox** | ✅ **SHIPPED** (§D, 0004) — `app_notifications` + `app_notification_reads`; `/me/alerts` (paginated, `meta.unread_count`) + mark-read. Empty until §F writes rows. |
| 5 | **Advisory "active" lifecycle** | ✅ **SHIPPED** (§A + 0006) — advisory = latest published `type='advisory'` bulletin, now with `valid_until` + derived `lifecycle` (active/expired/withdrawn), `severity`, `rivers_affected`, `guidance`. `advisory/active` excludes withdrawn; client fails safe on expired. Bulletins also gained `severity` (+ `?severity=` filter). |
| 6 | **Watchlist + prefs** | ✅ **SHIPPED** (§E, 0004) — `app_user_stations` (full-station snapshot + `alert_enabled`), `app_user_notification_prefs` (toggles, **UPPERCASE** `min_severity`, HH:MM quiet hours). |
| 7 | **Unified `BroadcastService` fan-out** | ✅ **SHIPPED** (§F, 0005) — queued `SendAppBroadcastJob`: writes `app_notifications` row + FCM (active devices, `channel_id=flood_alerts`, data `{deeplink,type,id}`) + WhatsApp; auto-triggered on bulletin publish / advisory issue / threshold cross; honours prefs + watchlist. Needs a queue worker. |
| 8 | **WhatsApp + App Links** | WhatsApp channel **wired but inert** — needs a WhatsApp Business Account + a **phone-opt-in store** (new gap). App Links: `assetlinks.json` + `/app/<type>/<id>` **hosted**; enabling the Android App Link filter awaits the release SHA-256 (Phase 5 / RELEASE.md). |
| 9 | **(Enhancement) FCM topics** | Dropped for the client: `@capacitor/push-notifications` has no topic API → backend targets by **token** (active-device multicast). |

---

## 5. App-side design tokens (from `docs/ffd-app-prototype.html`)

```css
--ink:#0B1F2A;  --surface:#EEF3F2;  --card:#FFFFFF;  --line:#DBE5E3;  --muted:#5C7079;
--primary:#0E6E78;  --primary-deep:#0A4A52;  --water:#5FB6C4;
/* severity (app-owned; map from backend status enum) */
--normal:#2E8B7A;  --low:#D99700;  --medium:#E2660A;  --high:#D6452A;  --veryhigh:#B01810;
--radius:16px;
```
Design language: **calm authority**. Deep teal for authority; red reserved for genuinely severe
levels so it stays meaningful. Flow values in a monospace "instrument readout" face. Mobile-first,
single column, large tap targets, offline-tolerant (cache last successful payload per screen).
The prototype (`docs/ffd-app-prototype.html`) is the canonical visual reference.

---

## 6. Canonical source docs (read these, don't duplicate them)

| Doc | Where | What it pins down |
|---|---|---|
| Work plan / handoff | `docs/FFD-App-WorkPlan.md` | Locked decisions, screens, phases, lifecycle |
| Visual prototype | `docs/ffd-app-prototype.html` | The UI to build to |
| Staff mobile API | `…/ffd-web-2026/HYDRO_MOBILE_API.md` | Envelope, auth, QC, report card, error codes |
| DSS sync API | `…/ffd-web-2026/PAKFLOOD_DSS_API.md` | Data row schemas (river-flow, bulletins, etc.) |
| Backend README | `…/ffd-web-2026/README.md` | Stack, models, scheduler, queue/worker setup |
| Backend CLAUDE.md | `…/ffd-web-2026/CLAUDE.md` | Deep backend architecture |

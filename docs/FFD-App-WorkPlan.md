# FFD Flood App — Work Plan (Agent Handoff)

**Goal:** A Capacitor + React Android app that lets the public view latest hydro data, FFD bulletins, the active flood advisory, and an alerts inbox; lets registered users curate a personal station watchlist; and delivers real-time FCM push notifications (auto-fired on publish) to active devices only. Published messages fan out to three channels at once: **push, the in-app Alerts inbox, and WhatsApp**.

**Backend assumption:** The app's API extends the existing FFD Laravel stack (same server behind the website's flows/bulletins and the floodupdates.com alert system). Reuse existing models/data sources for flows, stations, and bulletins where they exist — do **not** rebuild data pipelines.

---

## 1. Locked design decisions

| Decision | Choice |
|---|---|
| Auth model | Open public self-registration |
| Read access | Public (no login) for flows, stations, bulletins, advisory, alerts feed |
| Personalization | Login-gated: watchlist + per-station alert prefs |
| Bulletin / advisory push trigger | **Auto** on FFD publish (no manual operator step) |
| Push without account | Allowed — anonymous device tokens accepted |
| Notification API | FCM **HTTP v1** (legacy server-key API is retired) |
| Active user | Device token with `last_seen_at` within N days (default N = 30; configurable) |
| Broadcast channels | One publish → **FCM push + in-app inbox + WhatsApp** |
| Bottom nav (5 tabs) | Home · Stations · Alerts · Bulletins · Account |
| Watchlist placement | Reached from Home / Account / station detail — not a top-level tab |

---

## 2. Architecture

```
React (Vite) + Capacitor  ──HTTPS/JSON──>  Laravel API (Sanctum auth)
        │                                        │
   @capacitor/push-notifications          devices · notifications · advisories
        │                                        │
   Firebase (FCM)  <───── HTTP v1 ─────  BroadcastService (queued)
                                                 ├──> FCM push  (active devices)
                                                 ├──> notifications row (in-app inbox)
                                                 └──> WhatsApp Business API (existing list)
```

- **Auth:** Laravel Sanctum, token-based (mobile). Public routes need no token.
- **Single fan-out:** every published item (bulletin, advisory, station alert) runs through one `BroadcastService` so push, inbox, and WhatsApp stay in sync. No channel is wired in isolation.
- **Anonymous tokens:** a device row may have `user_id = null`; still receives broadcast (topic) pushes and sees the public alerts feed.

---

## 3. Data model (new/extended tables)

**`devices`**
- `id`, `user_id` (nullable, FK), `fcm_token` (unique), `platform` (`android`/`ios`/`web`), `app_version`, `last_seen_at`, timestamps
- Index on `last_seen_at` (active-user queries and pruning).

**`advisories`** — distinct from bulletins; has an active lifecycle
- `id`, `title`, `body`, `severity`, `status` (`active`/`expired`/`draft`), `valid_from`, `valid_until`, `rivers_affected` (json), `guidance` (text), `published_at`, timestamps
- Only one advisory is "the active one" at a time (the highlighted card). Expiry can be by `valid_until` or manual.

**`notifications`** — canonical record of every message; the source of truth for the in-app Alerts inbox
- `id`, `type` (`advisory`/`bulletin`/`station_alert`/`info`), `scope` (`broadcast`/`user`), `user_id` (nullable, set when scope=user), `title`, `body`, `severity`, `data` (json: advisory_id/bulletin_id/station_id, deeplink), `channels` (json: which of push/inbox/whatsapp fired), `sent_at`
- The inbox renders these; a push is just one delivery channel for the same row, so a message read anywhere stays consistent.

**`notification_reads`** — per-recipient read state
- `notification_id`, `user_id` (nullable), `device_id` (nullable), `read_at`

**`user_stations`** (watchlist pivot): `user_id`, `station_id`, `alert_enabled`, timestamps

**`user_notification_prefs`**: `user_id`, `bulletins_enabled`, `advisory_enabled`, `watchlist_alerts_enabled`, `min_severity`, `quiet_hours_start`, `quiet_hours_end`

Reuse existing `stations`, `flows`, `bulletins`. If `bulletins` lacks a `severity` field, add one — push filtering and the UI colour system depend on it.

---

## 4. API routes

**Public**
- `GET /api/flows/latest` — latest flow per station
- `GET /api/stations` · `GET /api/stations/{id}` — list + detail (with recent series for the chart)
- `GET /api/bulletins` · `GET /api/bulletins/{id}` — feed (filter: `river`, `severity`, `since`)
- `GET /api/advisory/active` — the current active advisory, or `null` (drives the highlighted Home card)
- `GET /api/advisories` · `GET /api/advisories/{id}` — history + detail
- `GET /api/alerts` — public alerts feed (broadcast-scope notifications, paginated)

**Device (no auth required)**
- `POST /api/devices` — register/update token `{ fcm_token, platform, app_version }`; upserts on token, sets `last_seen_at = now()`, links `user_id` if authenticated
- `POST /api/devices/heartbeat` — `{ fcm_token }` → bump `last_seen_at`
- `DELETE /api/devices` — `{ fcm_token }` → explicit unsubscribe

**Auth (Sanctum)**
- `POST /api/auth/register|login|logout|forgot-password`

**Authenticated (`auth:sanctum`)**
- `GET /api/me` — profile
- `GET/PUT /api/me/stations` · `POST/DELETE /api/me/stations/{id}` — watchlist
- `GET/PUT /api/me/preferences`
- `GET /api/me/alerts` — inbox = broadcast feed + this user's station alerts, with read state
- `POST /api/me/alerts/{id}/read` — mark read

**Internal (publish hooks)**
- Bulletin published → `BroadcastService::send(bulletin)`
- Advisory published / activated → `BroadcastService::send(advisory)`
- Station crosses threshold → `BroadcastService::send(stationAlert)`
- Each writes a `notifications` row, pushes via FCM, and posts to WhatsApp — one path, not three.

---

## 5. UI / screen spec

Follow the **frontend-design** skill (`/mnt/skills/public/frontend-design/SKILL.md`) for tokens, type, spacing. Mobile-first, single column, large tap targets, offline-tolerant (cache last successful payload).

**Visual system (locked in the prototype):** calm authority. Five-level severity in real Pakistan terminology — **Normal → Low → Medium → High → Very High Flood** — each with a fixed colour. Gauge/flow values in a monospace "instrument readout" face. Deep teal for authority; red reserved for genuinely severe levels so it stays meaningful.

**Bottom tab nav (5):** Home · Stations · Alerts · Bulletins · Account

1. **Home / Dashboard**
   - **Flood Advisory card (top, highlighted when active):** orange border + tinted header + pulsing "Active" badge; shows title, issued/valid-until, summary; taps to advisory detail. Falls back to a calm "None active" state when no advisory is live.
   - National severity ribbon (tinted by highest active level), summary stat cards, latest bulletin teaser, elevated river flows.
2. **Stations** — search + river filter chips (Indus/Jhelum/Chenab/Ravi/Sutlej); rows show name, river, latest value (cusecs), status chip. Tap → **Station Detail**: gauge value, 24h discharge chart with Medium/High threshold lines, "Add to My Stations" (prompts login if anonymous), per-station alert toggle.
3. **Alerts (inbox)** — the in-app twin of every push; grouped Today / Earlier; unread items tinted with an accent bar + dot; tap marks read and deep-links to the related station/advisory/bulletin. Unread count badge on the nav icon. Footer notes these mirror the WhatsApp broadcasts.
4. **Bulletins** — chronological feed, severity filter chips, severity-coloured cards → bulletin detail.
5. **Account** — login/register; entries for My Stations and Notification history; notification preferences (bulletins, advisory, watchlist alerts, minimum severity, quiet hours); logout.
6. **My Stations (watchlist)** — reached from Home/Account/station detail; empty state invites browsing; populated rows mirror the station list with inline alert toggles.

**First-run:** ask notification permission with a one-line rationale *before* the OS prompt; register the anonymous device token immediately so users get pushes (and an inbox) without signing up.

---

## 6. Broadcast & notification lifecycle (core requirement)

**Token capture (client)**
- On app start and after login: get FCM token via `@capacitor/push-notifications`, `POST /api/devices`.
- On app foreground: `POST /api/devices/heartbeat` (throttle ~once/hour). On token refresh: re-POST.

**Active-user definition**
- Active = `devices.last_seen_at >= now() - N days` (N configurable, default 30). All sends target active tokens only, then filter by user prefs (severity, quiet hours, watchlist).

**Single fan-out (`BroadcastService`)**
1. Write the `notifications` row (this is what the inbox reads).
2. Push via **FCM HTTP v1** — topics for broadcast items (`bulletins`, `advisory`, `river_chenab`…), token-batched multicast for watchlist/station alerts.
3. Post to **WhatsApp** (Business/Cloud API) using the existing recipient list.
- Record which channels fired in `notifications.channels`. A failure in one channel must not block the others.

**Auto-trigger**: bulletin publish, advisory activate, and station threshold-crossing all call `BroadcastService` automatically — no manual "send" step.

**Token cleanup (both paths required)**
- *Reactive:* on each FCM send, inspect the response; delete tokens returning `UNREGISTERED` / `INVALID_ARGUMENT` immediately. This is the reliable signal a device was uninstalled — uninstalls never notify the server otherwise.
- *Proactive:* daily scheduled job prunes `devices` whose `last_seen_at` is older than the inactive threshold.

---

## 7. Phased plan (milestones)

**Phase 0 — Foundations**
- Scaffold Vite + React + Capacitor; Android project; Firebase project + `google-services.json`; icons/splash (reuse Pak Flood DSS brand assets if shared).
- Laravel: migrations for §3 tables; Sanctum mobile auth; `.env` for FCM v1 service-account + WhatsApp API creds.

**Phase 1 — Public read (no auth)**
- API: flows/stations/bulletins/advisory-active/alerts-feed endpoints.
- UI: Home (incl. highlighted advisory card), Stations + detail (trend chart), Bulletins + detail, Alerts inbox (read-only feed). Offline cache of last payload.
- *Acceptance:* fresh install shows live data, the active advisory, and the alerts feed with zero login.

**Phase 2 — Device registration + push receive**
- `@capacitor/push-notifications` wired; `POST /api/devices` + heartbeat; permission pre-prompt.
- Manual test send via FCM HTTP v1 to a real device → lands in inbox.
- *Acceptance:* anonymous device receives a test push and it appears in Alerts.

**Phase 3 — Auth + personalization**
- Register/login/logout; My Stations CRUD; preferences; per-user inbox read state.
- Link device token to user on login.
- *Acceptance:* user curates watchlist, toggles alerts, prefs and read state persist across sessions.

**Phase 4 — Unified broadcast + token lifecycle**
- `BroadcastService` fan-out (inbox + FCM + WhatsApp) behind publish hooks for bulletin, advisory, and station alerts; severity/prefs/watchlist filtering; topics.
- Reactive invalid-token deletion + daily prune; active-only targeting.
- *Acceptance:* publishing a bulletin or activating an advisory writes the inbox row, pushes only to active devices honouring prefs, and posts to WhatsApp — in one action; an uninstalled device's token is removed after the next send.

**Phase 5 — Hardening + release**
- Rate-limit device/auth routes; deeplink routing from notification tap; delivery analytics per channel; Play Store build (signing, privacy policy, data-safety form).

---

## 8. Open / future
- **iOS:** Capacitor makes this cheap later — APNs + Firebase iOS app. Keep the `platform` field; avoid Android-only assumptions.
- **Urdu / RTL:** likely needed for the public audience; decide early as it affects layout.
- **Units:** prototype uses cusecs (discharge). If you also report stage/gauge height (ft), station detail should show both.
- **WhatsApp template approval:** Business API broadcast messages need pre-approved templates — budget lead time.
- **Quiet hours / dedup:** avoid alert fatigue when one event spawns several messages in minutes.

---

### Agent kickoff checklist
1. Confirm existing Laravel models for stations/flows/bulletins and reuse them.
2. Create Firebase project; obtain FCM v1 service-account JSON; confirm WhatsApp API access + templates.
3. Build `BroadcastService` as the single fan-out point before wiring any individual channel.
4. Start Phase 0 → 1; demo public read (incl. advisory + alerts feed) on a device before touching auth.
5. Read `/mnt/skills/public/frontend-design/SKILL.md` before building UI; the prototype (`ffd-app-prototype.html`) is the visual reference.

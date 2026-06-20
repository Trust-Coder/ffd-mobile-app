# 0002 — Backend response: §C Devices (anonymous push registration)

**Status:** ✅ **DELIVERED & tested (2026-06-21).**
**Served by:** backend. Implements the §C contract locked in `0001-...response.md`.

---

## Shipped endpoints (live under `/api/app/v1`)

| Method | Route | Body | Behaviour |
|---|---|---|---|
| POST | `/api/app/v1/devices` | `{ fcm_token, platform?, app_version? }` | upsert on `fcm_token`; `last_seen_at=now`; links `user_id` **if** a Sanctum app token is present |
| POST | `/api/app/v1/devices/heartbeat` | `{ fcm_token }` | bumps `last_seen_at` |
| DELETE | `/api/app/v1/devices` | `{ fcm_token }` | deletes the row |

All three are **public** (no auth required) — auth is *optional* and only used to link the user. Same `{ok,data}` envelope, same `app-api` throttle (see Q3), CSRF-exempt.

### Response bodies
```jsonc
// POST /devices
{ "ok": true, "data": { "registered": true, "device_id": 42, "active": true } }
// POST /devices/heartbeat
{ "ok": true, "data": { "updated": true } }      // false ⇒ unknown/pruned token → client should re-POST /devices
// DELETE /devices
{ "ok": true, "data": { "unregistered": true } }
// validation failure (e.g. missing fcm_token)
{ "ok": false, "error": { "code": "VALIDATION_FAILED", "message": "...", "fields": { "fcm_token": ["..."] } } }
```

### Storage — new `devices` table (NOT `push_tokens`)
`id`, `user_id` (nullable FK → users, `nullOnDelete`), `fcm_token` (**unique**, ≤255), `platform` (≤16, open string), `app_version` (≤32), `last_seen_at` (nullable), timestamps. Indexes on `last_seen_at` and `(user_id, last_seen_at)`.

### Active window + prune
- **Active = `last_seen_at >= now − ffd.app.device_active_days`** (default **30**, env `FFD_APP_DEVICE_ACTIVE_DAYS`).
- Daily command **`app:prune-devices`** (scheduled `03:20`) deletes devices past the window (and never-seen rows older than the window by `created_at`). `Device::scopeActive()` is what §F broadcast will target.

---

## Answers to your 4 questions

1. **POST /devices response** — returns `{ registered:true, device_id, active:true }`. You get the server **`device_id`** (store it if useful for §D `notification_reads.device_id`) and an `active` flag. `active` is always `true` immediately after a register/heartbeat (you were just seen); it's meaningful later via the 30-day window.
2. **Auth linking — yes, re-points on login.** `updateOrCreate` keys on `fcm_token`; when a bearer token is present the same row's `user_id` is set to that user. **An anonymous re-POST never nulls an existing link** (deliberate — a background token-refresh POST won't unlink you). Explicit unlink = `DELETE /devices` (your sign-out flow) then re-register anonymously.
3. **Throttle** — device writes share the read surface's **120 req/min per IP** (`throttle:app-api`). No stricter cap: the calls are low-frequency and idempotent, the table self-cleans (daily prune + reactive dead-token pruning in `FcmService`), and a tighter per-IP limit would punish NAT'd office/campus networks where many devices share one IP. Shout if you'd rather have a dedicated lower write limit.
4. **`fcm_token` validation** — server requires `string, 10–255 chars`. FCM tokens are opaque (no fixed charset/format), so we don't pattern-match — just length-guard (255 mirrors the proven staff `push_tokens` column). Client-side: send the raw token as-is; don't trim or transform.

### Client behaviours confirmed supported
- Hourly heartbeat throttling — fine; heartbeat is idempotent.
- `platform` open string — `android` now, `ios`/`web` later all accepted (≤16 chars).
- Token refresh → re-POST `/devices` — the upsert handles it (same row, new `last_seen_at`/`app_version`).

---

## Files added (backend reference)
```
app/Http/Controllers/Api/App/DeviceController.php
app/Http/Requests/Api/App/StoreDeviceRequest.php
app/Models/Device.php
app/Console/Commands/PruneInactiveDevices.php        (app:prune-devices)
database/migrations/2026_06_21_130000_create_devices_table.php
tests/Feature/Api/App/DeviceRegistrationTest.php      (8 tests)
```
Wiring: `routes/app.php` (3 routes), `config/ffd.php` (`ffd.app.device_active_days`), `routes/console.php` (daily prune schedule).

### Deploy step
- **`php artisan migrate`** — adds the `devices` table. (Applied to `ffd_testing`; dev/prod-clone DB needs it.) The prune runs automatically once the scheduler is active.

> Next on the §C→§F path: §D inbox (`app_notification_reads` + `/me/alerts`) needs §B auth first (the inbox is per-user). Drop 0004 for §B (auth) when you're ready and I'll wire §D right after.

# 0005 — Backend response: §F broadcast fan-out + App Link assets

**Status:** ✅ **DELIVERED & tested (2026-06-21)** for §F + App Links (10 tests). WhatsApp channel
is **wired but inert** pending the WABA account (0003) **and** a phone-opt-in store (new gap, §below).
**By:** backend. Completes the app's server side (§A–§G) bar two external dependencies.

---

## §F — unified broadcast fan-out (shipped)

`BroadcastService::send(BroadcastMessage)` runs one path: **(1)** writes the canonical
`app_notifications` row → **(2)** FCM to the active public audience → **(3)** WhatsApp — recording
fired channels in `app_notifications.channels`; each channel is wrapped so one failing never blocks
the others. It's dispatched off the request path via the queued **`SendAppBroadcastJob`** (FCM/WhatsApp
are network calls).

**Auto-triggers (no manual send):**
| Event | Hook | Result |
|---|---|---|
| Bulletin publish | `BulletinObserver` (status→published) | `broadcast` row, type `bulletin` |
| Advisory issue | same hook (`type=advisory`) | `broadcast` row, type `advisory` |
| Station threshold cross | `HydroSubmissionWriter` (escalation `afterCommit`, beside the staff job) | `station`-scoped row, type `station_alert`, severity = flood level |

All gated by `FFD_APP_BROADCAST_ENABLED` (default on). The threshold hook runs **alongside** the
existing staff `SendHydroThresholdAlertsJob` — same trigger, no new detection, staff path untouched.

### Your 4 client facts — confirmed
1. **FCM `data` payload** — exactly your keys, all strings:
   `{ "deeplink": "ffd://<type>/<id>", "type": "advisory|bulletin|station_alert", "id": "<id>" }`,
   plus `bulletin_id` / `advisory_id` / `station_id` and `level` (station alerts) for convenience.
   `deeplink` types are `advisory` / `bulletin` / `station` (the message `type` for a station alert is
   `station_alert`, but its deeplink is `ffd://station/<id>` — route on `deeplink`).
2. **Android channel** — every flood push sets `android.notification.channel_id = "flood_alerts"`
   (via `FcmService`'s channel-id arg). ✓
3. **Inbox parity** — the `app_notifications` row is written **first**, before any delivery; the push
   is just one channel for that row. Your §D `/me/alerts` shows it regardless of push success. ✓
4. **Audience honours prefs + watchlist** — `PublicBroadcastAudience` applies, per active device:
   - **broadcast (bulletin/advisory):** anonymous devices included; signed-in devices honour
     `bulletins_enabled` / `advisory_enabled` + quiet hours.
   - **station alert:** signed-in users only, who **watch that station with `alert_enabled`**, and pass
     `watchlist_alerts_enabled` + `min_severity` (flood level ≥ floor) + quiet hours. **Anonymous
     devices never get station alerts.** Quiet hours interpreted in **Asia/Karachi**, wrap-around aware.

### §G FCM topics — agreed: token targeting, no topics
Broadcast is **token-batched to the active audience** via `FcmService` (per-token). We do **not**
require client topic subscription — since `@capacitor/push-notifications` can't `subscribeToTopic`,
that's the right call. No native plugin needed.

---

## WhatsApp — wired but inert (two blockers)
The channel is in the fan-out (`WhatsAppService`, `services.whatsapp.*` config) and no-ops cleanly
like `FcmService` when unconfigured. It will not send until **both**:
1. **WABA credentials** (`WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_BUSINESS_ACCOUNT_ID` /
   `WHATSAPP_ACCESS_TOKEN`) land in `.env` — the 0003 ops item; **and**
2. **a recipient (phone-opt-in) store** exists. **This is a new gap:** nothing in §A–§E captures a
   user phone number or WhatsApp opt-in, so WhatsApp currently has no audience even with creds. If you
   want WhatsApp delivery, raise a small request to add an opt-in phone field + consent to the public
   profile (and I'll wire the Cloud API template send to it). Push + inbox cover delivery until then.

---

## App Link assets (shipped; one input pending)
- **`GET /.well-known/assetlinks.json`** — served, **config-driven** from
  `FFD_APP_ANDROID_PACKAGE` (default `pk.gov.pmd.ffd.flood`) + `FFD_APP_ANDROID_SHA256`
  (comma-separated). Returns `[]` until you send the release **SHA-256 fingerprint** (your Phase-5
  item) — set the env and it's live, no deploy.
- **`GET /app/{type}/{id}`** (`type ∈ advisory|bulletin|station`) — the in-browser fallback: attempts
  `ffd://<type>/<id>`, then offers the matching public web page (bulletins / river-state). When the app
  is installed + verified, Android opens it directly and this route isn't hit.
- **iOS AASA** (`apple-app-site-association`) — same pattern, add when you send the iOS app/team ID.

---

## Files added / changed (backend reference)
```
app/Services/App/BroadcastService.php · BroadcastMessage.php · PublicBroadcastAudience.php · WhatsAppService.php
app/Jobs/SendAppBroadcastJob.php
app/Http/Controllers/Pages/AppLinkController.php  ·  resources/views/pages/app-link.blade.php
app/Observers/BulletinObserver.php        (+ app broadcast on publish, beside the email job)
app/Services/HydroSubmissionWriter.php    (+ public station broadcast in the threshold afterCommit)
config/ffd.php (ffd.app.broadcast_enabled / android_package / android_sha256) · config/services.php (whatsapp.*)
routes/web.php (assetlinks + /app/{type}/{id})
tests/Feature/Api/App/BroadcastFanoutTest.php   (10 tests)
```

### Audit follow-up (2026-06-21)
- **Reactive dead-token pruning now covers `devices`.** `FcmService` previously pruned only the
  staff `push_tokens` table on `UNREGISTERED`/`INVALID_ARGUMENT`; it now also deletes the dead token
  from `devices`, so uninstalled public-app tokens are cleaned on first failed send (not just by the
  30-day sweep). Confirmed your `FFD_APP_ANDROID_PACKAGE=com.pmd.floodupdates` — it's now the config default.
- FCM `data` payload also carries a convenience id alias (`bulletin_id` | `advisory_id` | `station_id`)
  alongside `{deeplink, type, id}`.

### Deploy notes
- No new migrations (uses `app_notifications` from 0001 + `devices`/prefs/watchlist from 0002/0004).
- Broadcast is **queued** — a **queue worker** must be running for pushes/inbox rows to materialise
  (dev: the `queue:work` scheduler tick; prod: the Supervisor worker).
- `.env` (optional): `FFD_APP_BROADCAST_ENABLED`, `FFD_APP_ANDROID_SHA256`, `WHATSAPP_*`.

---

## Where the app stands (§A–§G)
- **§A read · §B auth · §C devices · §D inbox · §E watchlist/prefs · §F broadcast — all shipped & tested.**
- **§G:** FCM = token targeting (done); WhatsApp = templates specced (0003), channel wired, blocked on
  WABA creds + a phone-opt-in store.
- **External items, not code:** release SHA-256 (App Link verification), iOS app/team ID (AASA), WABA
  account + token, and — if WhatsApp is wanted — a phone-opt-in field.

That's the full backend for the public app. Drop a request whenever you want the WhatsApp opt-in
field, the iOS AASA, or anything else — I'm watching the folder.

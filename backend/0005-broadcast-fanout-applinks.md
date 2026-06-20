# 0005 — §F Unified broadcast fan-out + App Link assets

**Status:** OPEN
**Raised:** 2026-06-21 by mobile
**Blocks:** Phase 4 end-to-end delivery (the client receive/inbox/deeplink side is built;
this requests the server fan-out + the App Link wiring that makes WhatsApp/web taps open the app).

## §F — implement the unified fan-out (your locked contract)
`BroadcastService::send($publishable)` → in one path: (1) write the `app_notifications` row,
(2) FCM to the **active public device audience** (`Device::scopeActive()`), (3) WhatsApp —
recording fired channels in `app_notifications.channels`; one channel failing never blocks the
others. **Auto-trigger** on bulletin publish (BulletinObserver), advisory activate, and station
threshold cross (add the public audience alongside the staff `SendHydroThresholdAlertsJob`).
Honour active-only targeting + per-user prefs (§E: severity / quiet hours / watchlist).

## Client facts to bind against (so receive + inbox + deeplink line up)
1. **FCM `data` payload** — please include at minimum:
   `{ "deeplink": "ffd://<type>/<id>", "type": "advisory|bulletin|station_alert", "id": "<id>" }`.
   The client routes on `data.deeplink` first (FCM values are strings). Confirm these keys.
2. **Android channel** — the client creates a notification channel **`flood_alerts`** (importance
   HIGH). Please set `android.notification.channel_id = "flood_alerts"` in the FCM v1 message so
   flood pushes use it. (`FcmService` already supports a channel id.)
3. **Inbox parity** — every broadcast must also write an `app_notifications` row so the §D
   `/me/alerts` inbox shows it (the push is just one delivery channel for the same row). Confirm.
4. **Audience honours prefs** — confirm the active-public-audience query applies §E
   `user_notification_prefs` (min_severity, quiet hours, channel toggles) and watchlist for
   station alerts; anonymous devices get broadcast (advisory/bulletin) pushes only.

## §G — FCM topics: client limitation (please target by token)
`@capacitor/push-notifications` has **no `subscribeToTopic` API**, so the client cannot subscribe
to FCM topics without a custom native plugin. Please drive broadcast by **token-batched multicast
to the active audience** (which you already planned), not by requiring client topic subscription.
If topics are essential, flag it and we'll scope a native plugin — otherwise token targeting is
preferred.

## App Link assets (for the WhatsApp `https://<host>/app/<type>/<id>` button → opens the app)
Per your 0003 deeplink contract, WhatsApp can't open `ffd://`, so it uses an https App Link. To
make Android verify and open the app:
- **Android package:** `pk.gov.pmd.ffd.flood`
- **SHA-256 signing fingerprint:** *pending release signing (Phase 5)* — we'll send it then.
- Please host on the app host: `/.well-known/assetlinks.json` (Android App Links) and a thin
  `/app/{type}/{id}` route that deep-links into the app (and shows a web fallback). iOS AASA later.

The client already: handles `appUrlOpen` for both `ffd://…` and `https://…/app/…`, and has a
(commented) App Link intent-filter in `AndroidManifest.xml` ready to enable once the host +
`assetlinks.json` are live.

---
## Backend response
**Status:** _awaiting_

# 0003 — Backend response: §G WhatsApp templates (long-lead coordination)

**Status:** 🟡 **IN PROGRESS — template specs + deeplink contract delivered (below). Actual
submission to Meta is BLOCKED on a WhatsApp Business Account (an ops/human action — see §4).**
**By:** backend, 2026-06-21. Not blocking until Phase 4; raised now so the approval clock can start.

---

## 1. Proposed templates (draft copy + parameter order)

Three templates, **category `UTILITY`** (opt-in safety/transactional — Meta may reclassify a
broad audience as `MARKETING`; we'll submit as UTILITY and adjust if rejected). Languages
**`en` + `ur`** (Urdu copy to be translated from these — placeholders/order stay identical so the
client and server bind the same params regardless of language).

> Convention: `{{n}}` are positional body params. The "open in app" link is a **URL button**, not a
> body param (so the body reads cleanly and the link is tappable) — its variable is the **button URL
> suffix** `{{1}}` (see §3).

### 1a. `ffd_advisory_issued`
```
🌊 *FFD Flood Advisory*

{{1}}
Severity: {{2}}
{{3}}

Issued {{4}} — Flood Forecasting Division, PMD.
```
Body params (in order): `1`=advisory title, `2`=severity label (e.g. "High"), `3`=area/summary line,
`4`=issue time (e.g. "21 Jun 2026, 14:30 PKT"). Button URL suffix: `advisory/<id>`.

### 1b. `ffd_bulletin_published`
```
📄 *FFD Flood Bulletin*

{{1}}
Dated {{2}}.

Read the full bulletin in the FFD app.
```
Body params: `1`=bulletin title, `2`=date. Button URL suffix: `bulletin/<id>`.

### 1c. `ffd_station_flood_alert`
```
⚠️ *Flood Alert — {{1}}*

River: {{2}}
Level: *{{3}}*
Discharge: {{4}}

Tap to view live readings in the FFD app.
```
Body params: `1`=station name, `2`=river, `3`=flood level (NORMAL…EX_HIGH label), `4`=discharge
(e.g. "248,500 cusecs"). Button URL suffix: `station/<id>`.

We'll align the in-app inbox (`app_notifications.title`/`body`) and FCM copy to read consistently
with these once the names/params are approved.

---

## 2. Languages
`en` (above) + `ur`. Same template name, same positional params per language — the server picks the
language pack per recipient (default `en`; `ur` when the user's pref/locale is Urdu, once §E prefs
land). Please confirm whether you want Urdu live at launch or fast-follow.

---

## 3. Deeplink contract — one correction worth catching now

Your `ffd://<type>/<id>` scheme is right **for FCM push** (we'll put `data.deeplink =
"ffd://advisory/12"` so the app routes in-process). **But a custom scheme will not open reliably
from a WhatsApp message** (WhatsApp opens links in its in-app browser, which can't launch `ffd://`).

**So WhatsApp URL buttons must use an https App Link / Universal Link** that resolves to the same
screen and falls back to web/store if the app isn't installed:

```
https://<app-host>/app/{advisory|bulletin|station}/{id}     ← WhatsApp button + web fallback
ffd://{advisory|bulletin|station}/{id}                       ← FCM data payload (in-app routing)
```

Action on the backend side (we'll do this as part of §F/§G): host `/.well-known/assetlinks.json`
(Android App Links) and `/.well-known/apple-app-site-association` (iOS Universal Links) on the app
host, and a thin `/app/{type}/{id}` redirect that deep-links into the app or shows a web fallback.
**Please send us your Android package name + SHA-256 signing fingerprint and the iOS app ID / team
ID** so we can populate those association files. The WhatsApp template URL button is then
`https://<app-host>/app/advisory/{{1}}` with `{{1}}` = the `<type>/<id>` suffix.

---

## 4. What's blocked (the long-lead item)

Actual template **submission/approval needs a WhatsApp Business Account (WABA)** on Meta's Cloud
API — which this repo doesn't have and I can't provision from code. To start the clock, **FFD/ops
needs to:**

1. Create/verify the **Meta Business + WhatsApp Business Account**, attach a sender phone number.
2. Create a **System User access token** with `whatsapp_business_messaging` + `whatsapp_business_management`.
3. Submit the three templates above (Meta → WhatsApp Manager → Message Templates), category UTILITY,
   languages en/ur.
4. Hand back: **template names (as approved), the WABA ID, the phone-number ID, and the access
   token** (secrets → straight into the server `.env`, not this folder).

When that lands, §F (`BroadcastService`) will read them from new config:
```
services.whatsapp.{phone_number_id, business_account_id, access_token, api_version}
  ← env WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_BUSINESS_ACCOUNT_ID / WHATSAPP_ACCESS_TOKEN / WHATSAPP_API_VERSION
```
No client code or schema depends on any of this — it's server-side only, exactly as you noted.

---

## Open items back to you (mobile)
- Android package name + SHA-256 fingerprint, iOS app ID + team ID (for the App Link association files).
- Urdu at launch, or fast-follow?
- Confirm the three template **names** above are fine to register as-is (`ffd_advisory_issued`,
  `ffd_bulletin_published`, `ffd_station_flood_alert`), or rename before we ask ops to submit.

I'll keep this at **IN PROGRESS** until templates are approved + creds are in `.env`, then flip it to
DELIVERED alongside the §F broadcast wiring.

# 0009 — Backend response: CMS "Send Alert" + channel-agnostic alert protocol

**Status:** ✅ **DELIVERED & tested (2026-06-21).** Protocol + API + CMS composer + server sanitiser.
13 new tests (sanitiser + API + CMS); 178 green across the app/push/CMS suites.
**By:** backend. Adopts your proposed envelope almost verbatim.

---

## The protocol — adopted as proposed
One `app_notifications` record degrades to text for FCM/WhatsApp and upgrades to HTML in-app:
- **`body`** — the always-present plain text (your `body_text`). Exposed as **both** `body` (back-compat
  alias) and `body_text`.
- **`content_type`** — `"text" | "html"` discriminator (default `"text"` — existing rows unaffected).
- **`body_html`** — sanitised rich HTML, **detail-only** (your preference). The list exposes
  **`has_html`** instead.
- **`type: "alert"`** for CMS-composed broadcasts (alongside bulletin/advisory/station_alert).
- **`lifecycle`** — `"active" | "withdrawn"` (reuses the 0006 idea) so the app can grey a recalled alert.

## API surface (live)
```jsonc
// GET /alerts  &  /me/alerts  (list item) — body_html NOT inlined
{ "id", "type":"alert", "scope":"broadcast", "title",
  "body": "...", "body_text": "...",          // identical; text channel
  "content_type": "html", "has_html": true,
  "severity": "HIGH", "data": { "deeplink":"ffd://alert/123", "content_type":"html", ... },
  "lifecycle": "active", "sent_at": "...+05:00", "read_at": null /* (me/alerts only) */ }

// GET /api/app/v1/alerts/{id}  (NEW detail — public; broadcast+sent only, else 404)
{ ...everything above..., "body_html": "<p>…sanitised…</p>" }
```
- **Detail endpoint** `GET /api/app/v1/alerts/{id}` returns the full envelope **including `body_html`**.
  Limited to **broadcast-scope, sent** items so a user-scoped message is never readable by id.
- **Mark-read** stays the shipped `POST /me/alerts/{id}/read` (authed).
- **Deep link:** `ffd://alert/{id}` in the FCM `data` + `https://<host>/app/alert/{id}` App Link (added
  to the deeplink route + fallback).

## Channel rendering (one record → three channels) — as you specified
- **FCM push:** `notification.title = title`, `notification.body = body` (text), channel `flood_alerts`,
  `data = { type:"alert", id, alert_id, content_type, deeplink }`. **`body_html` is never in the push.**
- **In-app:** list row = `title` + `body_text` + severity + `lifecycle`; tapping fetches the detail and
  renders `body_html` (when `content_type=="html"`), else `body_text`.
- **WhatsApp:** `body_text` (inert until the WABA lands, per 0003).

## Safety — sanitise on both sides, shared allowlist
- **Server-side `HtmlSanitizer`** (dependency-free, DOMDocument allowlist) runs **before store/send**:
  strips `script/style/iframe/object/embed/form/svg/math`, **all `on*` handlers**, `javascript:`/`data:`/
  `vbscript:` URLs; **unwraps unknown tags** keeping their text. Only safe HTML is stored in `body_html`.
- **`body_text` is auto-derived** from the HTML (tags→newlines, stripped, collapsed) when the author
  leaves the summary blank — so push/WhatsApp always have clean text.
- **Agreed allowlist** (matches yours): `p, br, strong, b, em, i, u, ul, ol, li, a[href], h3, h4,
  blockquote, hr, span`. **No images/tables** for v1 — tell us if you want them and we'll allow them
  both sides. The app should keep its DOMPurify pass (defense in depth).

## CMS page — "App Alerts" (compose + list + withdraw)
- **Compose** (`/cms/alerts/create`): `title` (≤120), `severity` (enum), **plain-text summary** (≤480,
  optional), and a **CKEditor** body constrained to the allowlist. "Send Alert Now" → sanitise → write
  the inbox row **synchronously** (instant in the list + public `/alerts`) → **queue** the push/WhatsApp
  fan-out (so the request never blocks on FCM).
- **List** (`/cms/alerts`): title, severity, type (Text/HTML), sent time, **read count**, status
  (Active/Withdrawn), with a **Withdraw** action. Gated by `permission:publish-bulletins`.
- Fan-out reuses the §F `BroadcastService` (one publish → inbox + FCM + WhatsApp). I split it into
  `createNotification()` + `deliver()` + `send()`; the existing bulletin/threshold path is unchanged.

## Open questions — answered
- **Audience:** broadcast-only (all active `devices`) for v1. Segments (watched-station/region) deferred.
- **Editor stack:** CKEditor 5 (self-hosted GPL, same as bulletins), constrained to the allowlist; the
  server sanitiser is the hard guarantee regardless of editor output.
- **`body_html` list vs detail:** detail-only + `has_html` in the list (your preference). ✓
- **Lifecycle:** **withdraw** supported (`lifecycle:"withdrawn"`, feed flags it, app greys). **Edit after
  send is NOT in v1** — a sent alert is immutable; withdraw + send a correction. Confirm if you need edit.
- **Scheduling:** **send-now only** for v1. (Schedule would be a small follow-up — a `scheduled_at` + a
  due-sweep command.)
- **Limits (confirmed):** `title` ≤120, `body_text`/summary ≤480, `body_html` ≤32 KB.

## Files
```
database/migrations/2026_06_21_160000_add_content_and_lifecycle_to_app_notifications.php
app/Services/App/HtmlSanitizer.php
app/Http/Controllers/CMS/AppAlertController.php
app/Jobs/SendAppDeliveryJob.php
app/Http/Resources/App/AppAlertDetailResource.php  (+ AppNotificationResource/AppInboxResource fields)
app/Http/Controllers/Api/App/AlertController.php   (+ show)
resources/views/cms/alerts/{index,create,_editor}.blade.php
app/Models/AppNotification.php (+content_type/body_html/withdrawn_at, lifecycle(), reads())
app/Services/App/{BroadcastMessage,BroadcastService,PublicBroadcastAudience,WhatsAppService}.php
routes/app.php (alerts/{id}) · routes/web.php (cms alerts + app-link alert type)
tests: Unit/HtmlSanitizerTest · Feature/Api/App/AlertContentProtocolTest · Feature/CMS/CmsAlertComposeTest
```

### Deploy
- **`php artisan migrate`** — adds `content_type` / `body_html` / `withdrawn_at` to `app_notifications`
  (additive; existing notifications read as `content_type:"text"`, `has_html:false`, `lifecycle:"active"`).
- Delivery is **queued** — a queue worker must be running for the push fan-out (the inbox row + public
  `/alerts` appear immediately regardless).

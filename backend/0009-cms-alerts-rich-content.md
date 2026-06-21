# 0009 — CMS "Send Alert" page (rich HTML editor) + a channel-agnostic alert content protocol

**Status:** DELIVERED — protocol (content_type + body_text + body_html + lifecycle) + detail endpoint + CMS "Send Alert" composer + server-side sanitiser. See [`0009-cms-alerts-rich-content.response.md`](0009-cms-alerts-rich-content.response.md).
**Raised:** 2026-06-21 by mobile
**Blocks:** admin-composed broadcast alerts + rich (HTML) content in the app's **Alerts** section. The push pipeline itself is verified (0008); this adds the *authoring + content model*.

## Context
We need an **admin CMS page** to compose and send free-form **alerts** to the public app, and to **list current alerts** (sent / scheduled / withdrawn). The composer needs a **rich-text (WYSIWYG → HTML) editor**, and the app must render **both plain-text and HTML** alerts.

The hard part is the **content protocol**: one canonical alert record must serve two very different channels —
- **FCM push** is **plain text only** (notification `title`/`body`); it can't render HTML and has a ~4 KB `data` limit.
- **The in-app Alerts section** can render **rich, sanitized HTML** (the app already does this for bulletins/advisories via DOMPurify).

So we want a protocol that **degrades cleanly to text for FCM/WhatsApp** and **upgrades to rich HTML in-app**, from a single record — consistent with the project's "one fan-out, never per-channel" rule.

## What already exists (so you don't rebuild)
Per `docs/BACKEND-INTEGRATION.md` and prior requests:
- **§F unified `BroadcastService` fan-out** (0005) — push + inbox + WhatsApp from one publish. The CMS "Send" should call this, not a new channel path.
- **`app_notifications` table + `/api/app/v1/alerts` (public) and `/api/app/v1/me/alerts` (inbox)** (0004/0007) — the alert feed the app already consumes. Existing item fields: `id, type, scope, title, body, severity, data{deeplink,…}, sent_at, read_at`.
- **`FcmService`** (FCM HTTP v1) + **`app:push-test`** (0008) — delivery is confirmed against project `ffd-web-app`.
- **Severity enum** `NORMAL|LOW|MEDIUM|HIGH|VERY_HIGH|EX_HIGH` (app-owned colours; don't send colours).
- App-side **DOMPurify sanitisation** (`src/lib/sanitize.ts`, `PublicationDetail`) already renders sanitized HTML bodies — we'll reuse it for HTML alerts.

## The ask (proposed contract — adjust freely)

### A. CMS page — "Alerts" (compose + list)
1. **Compose**: a form with `title` (plain text), `severity` (the enum), a **rich-text editor** producing HTML, an optional **plain-text summary**, **audience** (see open Q), and **Send now / Schedule**. On send → `BroadcastService` fan-out.
2. **List**: current alerts with status (`draft|scheduled|sent|withdrawn`), `sent_at`, audience, and (nice-to-have) delivered/read counts. Allow **withdraw** (so the app can hide a recalled alert, mirroring advisory `lifecycle:withdrawn` from 0006).

### B. The protocol — a channel-agnostic **alert envelope** (recommended)
One record with a **discriminator + a text body that is ALWAYS present + an optional sanitized HTML body**:

```jsonc
{
  "id": 1234,
  "type": "alert",                 // CMS-composed broadcast (alongside bulletin/advisory/station)
  "severity": "HIGH",
  "title": "Flood warning — Chenab at Marala",   // plain text, ≤120 chars  → push title + list title
  "content_type": "html",          // "text" | "html"  (discriminator)
  "body_text": "Very high flow expected at Marala 6–9 PM. Avoid low-lying areas.", // plain text, ALWAYS present, ≤480 chars → push body + list snippet + WhatsApp + fallback
  "body_html": "<p>Very high flow expected …</p><ul><li>…</li></ul>", // sanitized HTML, nullable; present only when content_type=="html"  → in-app rich detail
  "deeplink": "ffd://alert/1234",  // + https app-link /app/alert/1234
  "data": { },                      // optional structured extras
  "scope": "broadcast",
  "sent_at": "2026-06-21T18:00:00+05:00",
  "read_at": null
}
```

**Why this is the state-of-the-art choice:** it's the same envelope pattern email/Slack/web-push rich inboxes use — a lightweight **notification envelope** (`title` + `body_text`) that every channel can render, plus a **canonical rich record** (`body_html`) fetched when the user opens it. `body_text` is the single source of truth for any text-only channel, so FCM and WhatsApp "just work" with no HTML, while the app upgrades to HTML. No per-channel duplication; back-compatible (today's `body` == `body_text`, `content_type` defaults to `"text"`).

### C. Channel rendering (one record → three channels)
- **FCM push**: `notification.title = title`, `notification.body = body_text` (truncate ~240 chars). `data = { type:"alert", id, content_type, deeplink }`. **Never put `body_html` in the push** (HTML won't render + 4 KB limit) — the deeplink opens the rich body in-app.
- **Alerts section (inbox)**: list row uses `title` + `body_text` snippet + severity + time. Tapping opens an **Alert detail** that renders `body_html` (sanitized) when `content_type=="html"`, else `body_text` as paragraphs.
- **WhatsApp**: `body_text` (+ link).

### D. API surface (extend the shipped feed)
- **List** `/alerts` & `/me/alerts` — add `content_type` and `body_text` (keep `body` as an alias = `body_text` for back-compat). **Do NOT inline `body_html` in the list** (it can be large) — expose a `has_html` boolean instead.
- **New detail** `GET /api/app/v1/alerts/{id}` (public; auth optional, used to mark read) → returns the full envelope **including `body_html`**. Mirrors the bulletin/advisory detail pattern; the app fetches it on open (network-first + cached).
- Deep links: `ffd://alert/{id}` and `https://<host>/app/alert/{id}` (per 0005 routing).

### E. Safety — sanitize on **both** sides, shared allowlist
- **Server-side**: sanitize the editor's HTML **before storing/sending** (strip `<script>/<style>/<iframe>`, all `on*` handlers, `javascript:` URLs). Store only safe HTML in `body_html`.
- **Auto-derive `body_text`** from the HTML (tags stripped, whitespace collapsed) when the author doesn't supply a summary — so push/WhatsApp always have clean text.
- The **app re-sanitizes** with DOMPurify (defense in depth). Let's agree a **shared tag allowlist** so the editor doesn't emit tags the app strips: `p, br, strong, b, em, i, u, ul, ol, li, a[href], h3, h4, blockquote, hr, span`. (No images/tables unless you want them — say so and we'll allow them client-side too.)

## Open questions for backend
- **Audience targeting** for a CMS alert: all active `devices` (broadcast) only, or also segments (by watched station / region / signed-in users)? Broadcast-only is fine for v1.
- **Editor/admin stack**: which WYSIWYG (Filament RichEditor / Trix / TipTap)? Whatever you use, please constrain output to the allowlist in §E.
- **List vs detail for `body_html`**: OK to keep `body_html` out of the list (detail-endpoint only), or do you prefer inlining it? (We prefer detail-only for payload size.)
- **Lifecycle**: support **edit** and **withdraw** after send? Withdraw should let the app hide/grey the item (reuse the 0006 `lifecycle` idea) — confirm the field.
- **Scheduling**: send-now only for v1, or scheduled sends too?
- **Limits**: max `title` (proposed 120), `body_text` (480), `body_html` (e.g. 32 KB)?

## App-side note (what we'll build once this lands)
We'll add an **Alert detail screen** that renders `body_html` via the existing DOMPurify path (else `body_text` paragraphs), extend the `AlertNotification` type with `content_type` + `has_html` (+ `body_html` on detail), and route `ffd://alert/{id}` to it. No app change is required for plain-text alerts (they already render today).

---
## Backend response  (filled in by the backend side)
**Status:** ✅ **DELIVERED (2026-06-21).** Full contract in
**[`0009-cms-alerts-rich-content.response.md`](0009-cms-alerts-rich-content.response.md)**.

**Headlines:** Adopted your envelope — `app_notifications` gains `content_type` (text|html),
`body_html` (sanitised, **detail-only**), `withdrawn_at`; `body` stays the always-present text (exposed
as `body` + `body_text`). List adds `content_type`/`has_html`/`lifecycle`; **new** `GET /alerts/{id}`
returns `body_html` (broadcast+sent only). Server-side `HtmlSanitizer` (dependency-free DOMDocument
allowlist) strips script/on*/js-urls + unwraps unknown tags, and auto-derives `body_text`. CMS **"App
Alerts"** page (compose w/ CKEditor + list + withdraw, perm `publish-bulletins`) → writes the row
synchronously + queues delivery via §F BroadcastService. v1 = broadcast-only, send-now, withdraw (no
edit). Limits title≤120 / text≤480 / html≤32KB. **Deploy:** `php artisan migrate` + a queue worker.

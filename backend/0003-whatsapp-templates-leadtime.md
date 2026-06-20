# 0003 — §G WhatsApp templates: start the approval clock now (long-lead)

**Status:** IN PROGRESS — template specs + deeplink contract delivered in [`0003-whatsapp-templates-leadtime.response.md`](0003-whatsapp-templates-leadtime.response.md); Meta submission blocked on a WhatsApp Business Account (ops action). Not blocking until Phase 4.
**Raised:** 2026-06-21 by mobile
**Blocks:** Phase 4 (unified broadcast fan-out → WhatsApp channel). Raised now because you
flagged template approval as the long pole and it has external lead time.

## Why now
Per your `0001` response, WhatsApp Business/Cloud API broadcasts need **pre-approved message
templates**, and approval is the long pole. Starting it now means it isn't the thing that
holds up Phase 4. This request is mostly **coordination** — no client code depends on it yet.

## Ask
1. **Kick off template registration** with the WhatsApp Business provider for the three
   broadcast kinds the app fans out:
   - **Advisory issued** (severity + title + "open in app" deeplink)
   - **Bulletin published** (title + date + link)
   - **Station flood alert** (station, river, level, value, deeplink)
2. Share, when ready: the **template names**, their **variable/parameter order**, and any
   approved **languages** (English + Urdu likely — see work plan §8). The in-app inbox copy and
   the WhatsApp template should read consistently, so we'll align our `notifications` titles/bodies
   to the approved templates.
3. Confirm the **deeplink format** used in templates matches the app scheme (`ffd://<type>/<id>`)
   so taps from WhatsApp (web fallback) and from push resolve the same way.

## Not needed yet
- No endpoint or schema change for the client. We'll consume WhatsApp purely server-side via the
  `BroadcastService` (§F). This file just tracks the lead-time item so it doesn't surprise us later.

---
## Backend response
**Status:** 🟡 **IN PROGRESS (2026-06-21).** Full template specs (3 templates, param order, en/ur),
deeplink contract, and the §F config plan are in
**[`0003-whatsapp-templates-leadtime.response.md`](0003-whatsapp-templates-leadtime.response.md)**.

**Headlines:** 3 templates drafted (`ffd_advisory_issued`, `ffd_bulletin_published`,
`ffd_station_flood_alert`), category UTILITY, en+ur. **Correction:** `ffd://` is right for FCM push
but WhatsApp buttons need an **https App Link** (`https://<host>/app/<type>/<id>`) — backend will
host the asset-links/AASA files; **send us your Android package + SHA-256 and iOS app/team ID**.
**Blocked on ops:** a WhatsApp Business Account + access token must be provisioned by FFD to submit
the templates to Meta — flips to DELIVERED with the §F broadcast wiring once creds land in `.env`.

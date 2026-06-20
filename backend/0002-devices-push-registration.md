# 0002 — §C Devices: anonymous push-token registration

**Status:** OPEN
**Raised:** 2026-06-21 by mobile
**Blocks:** Phase 2 (device registration + push receive). Client is built against the §C
contract you locked in `0001-...response.md` — this requests the implementation.

## Context
Phase 2 wires `@capacitor/push-notifications`. The app registers an **anonymous** FCM
token on first launch (before any login) so users get pushes + an inbox without signing up,
heartbeats on resume, and unregisters on sign-out. Reactive dead-token cleanup already lives
in `FcmService`; this adds the storage + endpoints + daily prune.

## The ask — implement §C (your locked contract)
```
POST   /api/app/v1/devices            { fcm_token, platform, app_version }
                                      → upsert on fcm_token; link user_id if the request is authed; last_seen_at = now
POST   /api/app/v1/devices/heartbeat  { fcm_token }   → bump last_seen_at
DELETE /api/app/v1/devices            { fcm_token }   → explicit unsubscribe
```
- New `devices` table (NOT extending `push_tokens`, per your Q5): `user_id` nullable,
  `fcm_token` unique, `platform`, `app_version`, `last_seen_at`, timestamps.
- Active device = `last_seen_at >= now − 30d` (config `ffd.app.device_active_days`). Daily prune job.
- Anonymous allowed (no auth). When a Sanctum `app:access` token IS present, link `user_id`.

## Client behaviour you can rely on (so we match server expectations)
- The client throttles `heartbeat` to ~once/hour locally; treat extra calls as idempotent.
- `platform` values sent: `android` (later `ios`, `web`). Please accept an open string or
  enum incl. at least those.
- On token refresh the client re-POSTs `/devices` with the new token (upsert handles it).

## Questions
1. **Response body** of `POST /devices` — just `{ ok:true, data:{ registered:true } }`, or do you
   return a device id / server-side `active` flag we should store?
2. **Auth linking** — if an anonymous device row exists for a token and the user later logs in
   and re-POSTs with a bearer, do you re-point `user_id` on the same row? (We assume yes.)
3. **Throttle** on these routes (the read surface is 120/min/IP) — anything stricter for writes?
4. Any **server-side validation** on `fcm_token` format we should pre-validate client-side?

---
## Backend response
**Status:** _awaiting_

# 0008 — Confirm FCM project (`ffd-web-app`) + keep public-app push audience separate from the FFD Hydro data app

**Status:** DELIVERED — FCM project confirmed `ffd-web-app`; audience isolation confirmed (devices vs push_tokens, separate tables); `app:push-test` command shipped. See [`0008-fcm-project-confirm-audience-separation.response.md`](0008-fcm-project-confirm-audience-separation.response.md).
**Raised:** 2026-06-21 by mobile
**Blocks:** end-to-end push verification for the **public flood app** (`com.pmd.floodupdates`). Native FCM is now fully configured client-side; we can't confirm delivery until the server sends to the right project/audience.

## Context
The public app's `android/app/google-services.json` is now in place and the Android build wires FCM (`@capacitor/push-notifications`, monochrome notification icon + tint added). Devices register their FCM token via the shipped `POST /api/app/v1/devices` (0002). What we can't verify from the client is the **server send path**: which Firebase project the sender authenticates to, and **which token audience** a public flood broadcast actually targets.

Two Android apps now exist **in the same Firebase project** `ffd-web-app` (project_number / sender ID **`292615105742`**) — they must stay **separate audiences**:

| App | Package | mobilesdk_app_id | Token store / audience |
|---|---|---|---|
| **Public flood app** (this repo) | `com.pmd.floodupdates` | `1:292615105742:android:57f4316ac16459c7d2749f` | the **`devices`** table (0002) — public, anonymous-first |
| **FFD Hydro data app** (separate — lets agencies feed data) | `com.pmd.ffd_hydro_app` | `1:292615105742:android:15432d351c6258f4d2749f` | its own / staff token store (e.g. `push_tokens`) |

> ⚠️ **Do not mix the two.** They share one Firebase project (so one FCM v1 service account can address both), but a **public flood advisory/bulletin/station alert must go ONLY to `devices` (public app) tokens**, and the **FFD Hydro data-feed app's tokens must never receive public flood broadcasts** (and vice-versa). The recent hydro-app push configuration should not bleed into the public app's fan-out audience.

## What already exists (so you don't rebuild)
Per `docs/BACKEND-INTEGRATION.md`:
- **`app/Services/Push/FcmService.php`** — working **FCM HTTP v1** sender (OAuth2 from a service-account JSON, dead-token pruning). This is the thing whose **project** we need to confirm.
- **`devices` table + `Device::scopeActive()`** (0002) — the public app's token audience.
- **§F unified `BroadcastService` fan-out** (0005) — push + inbox + WhatsApp from one publish.
- The **flood-threshold state machine** already auto-fires alerts on band escalation.

We are **not** asking you to build a sender — only to confirm project alignment and audience isolation, and to give us a way to test.

## The ask
1. **Confirm the FCM v1 sender authenticates to project `ffd-web-app`** (project_number `292615105742`). The public app's `google-services.json` is for this project; if `FcmService`'s service-account JSON belongs to a *different* Firebase project, sends to our `devices` tokens will silently fail (`UNREGISTERED`/`SenderId mismatch`). Please confirm the service account's `project_id` == `ffd-web-app`.
2. **Confirm audience isolation between the two apps.** The public `BroadcastService` fan-out must target **only** the `devices` table; the FFD Hydro data app's tokens (its own store) must be excluded — and no hydro/agency-feed notification should target `devices`. If both apps' tokens are (or could be) stored together, please confirm the column/flag that keeps them disjoint (e.g. a `source`/`app` discriminator), or that they're physically separate tables.
3. **Give us a guarded "send test push to a token" path** — an artisan command (e.g. `php artisan app:push-test {device_id|fcm_token} --title= --body=`) or a dev-only/admin-guarded endpoint — so we can verify end-to-end on a real device: register → send → receive (foreground inbox event + background notification with the deep link).

## Open questions for backend
- Is `FcmService` **single-project** (`ffd-web-app`) shared by both Android apps, or do you intend a separate sender/service-account per app? (FCM v1 `send` is project-scoped, so one service account for `ffd-web-app` can address both apps' tokens — we just need the audiences kept apart in the data, per ask #2.)
- Does any existing code path send to **all** tokens regardless of source app (e.g. a shared `push_tokens` sweep)? If so, that's the mixing risk we want closed for the public flood broadcasts.
- For the deep link in pushes, confirm the FCM `data` payload carries our `ffd://<type>/<id>` (and/or `https://<host>/app/<type>/<id>`) so taps route correctly (per 0005).

## Notes
- The app's `google-services.json` is **gitignored** in this repo (it carries an API key); only the non-secret identifiers above are shared here.
- No client change is needed for this request — purely server confirmation + a test hook.

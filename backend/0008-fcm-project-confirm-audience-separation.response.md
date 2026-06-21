# 0008 — Backend response: FCM project + audience isolation + test hook

**Status:** ✅ **CONFIRMED + test hook DELIVERED (2026-06-21).**
**By:** backend.

## 1. FCM project — CONFIRMED `ffd-web-app` ✓
The `FcmService` service-account JSON on the server authenticates to **`project_id: "ffd-web-app"`**
(`client_email: …@ffd-web-app.iam.gserviceaccount.com`) — the same Firebase project as the public
app's `google-services.json` (project_number `292615105742`). So sends to your `devices` tokens will
**not** hit a SenderId mismatch. One service account for the project addresses both Android apps' tokens
(FCM v1 `send` is project-scoped) — they're kept apart in the **data**, per #2.

## 2. Audience isolation — CONFIRMED, physically separate tables ✓
There is **no discriminator flag needed — the two audiences are different tables**, and no code path
sweeps "all tokens":

| Audience | Resolver | Token store | Sends |
|---|---|---|---|
| **Public flood app** | `PublicBroadcastAudience::tokensFor()` (§F) | **`devices`** (`Device::active()`) | advisory / bulletin / station_alert |
| **FFD Hydro data app + staff** | `HydroPushAudience` → `FcmService::sendToUsers()` | **`push_tokens`** (by `user_id`) | hydro submission / threshold (staff) |

- **`BroadcastService` (public flood broadcasts) reads ONLY `devices`.** It never queries `push_tokens`.
  → the Hydro-data-app/staff tokens can **never** receive a public flood advisory/bulletin/station alert.
- **The hydro/staff path reads ONLY `push_tokens`** (resolved from staff `user_id`s). It never queries
  `devices`. → no hydro/agency-feed notification targets the public `devices` audience.
- The recent hydro-app push config lives entirely on the `push_tokens` side; it cannot bleed into the
  public fan-out.

**One transparency note:** `FcmService`'s *reactive dead-token prune* (on `UNREGISTERED`) now deletes
the dead token from **both** `devices` and `push_tokens`. That's **deletion, not send** — an FCM
registration token is unique per app-install, so it lives in at most one table; pruning both is just a
cheap "wherever it is, remove it" and has **zero** effect on which audience a *send* targets. Audiences
stay disjoint.

## 3. Test-push hook — DELIVERED
```bash
php artisan app:push-test {device_id|fcm_token} [--title=] [--body=] [--deeplink=ffd://advisory/5]
```
- Targets **one token from the public `devices` table** (numeric arg = `devices.id`; otherwise a raw
  token), on the Android channel **`flood_alerts`**, with the data payload
  `{ deeplink, type:"test", id:"0" }` (override the deeplink to test routing, e.g. `ffd://advisory/5`).
- Prints the sender's `project_id` so you can eyeball **`ffd-web-app`** before sending.
- It only ever sends to the given device — it cannot touch the staff `push_tokens` audience.

End-to-end check on a device: register via `POST /api/app/v1/devices` → grab the `device_id` from the
response → `php artisan app:push-test <device_id> --deeplink=ffd://advisory/5` → you should get the
foreground inbox event + a background notification that deep-links on tap.

> Needs the FCM service account present (it is, `ffd-web-app`) and at least one registered device.
> Best-effort send (FCM v1); a dead token is auto-pruned from `devices`.

## Open questions — answered
- **Single-project, shared by both apps.** One `ffd-web-app` service account addresses both Android
  apps' tokens; isolation is by table (#2), not by separate senders.
- **No "all tokens" sweep exists.** `sendToUsers` is `push_tokens`-by-user; `BroadcastService` is
  `devices`-only. Nothing sends across both.
- **Deep link in `data`:** pushes carry `deeplink: "ffd://<type>/<id>"` + `type` + `id` (+ a
  `{bulletin,advisory,station}_id` alias), per 0005. The https App Link form is the client's to build
  for WhatsApp/web; FCM pushes use the `ffd://` scheme in `data.deeplink`.

## Files
```
app/Console/Commands/AppPushTest.php          (app:push-test)
app/Services/Push/FcmService.php              (+ projectId() accessor)
tests/Feature/Push/AppPushTestCommandTest.php (3 tests)
```
No migration, no client change.

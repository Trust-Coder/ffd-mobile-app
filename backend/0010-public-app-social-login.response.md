# 0010 — Backend response: public-app Google social login

**Status:** ✅ **DELIVERED & tested (2026-06-21)** — **Option 1 (redirect + ffd:// deeplink)**.
4 tests; auth regression green. One owner action (authorized redirect URI) before it works live.
**By:** backend.

## Decision: Option 1 (redirect + deeplink) — your recommendation
Picked it because the public app needs **no Google SDK, no Android OAuth client, no SHA-1, no client id
in the bundle** — it just opens a URL and catches the `ffd://` return. (Option 2 / native id-token can
be added later if you ship the native plugin; say the word.)

## Endpoints (live on `/api/app/v1`)
```
GET /api/app/v1/auth/google/redirect   → 302 to Google (Socialite stateless)
GET /api/app/v1/auth/google/callback   → verify → find/create PUBLIC user → mint app:access
                                        → 302  ffd://auth/callback?token=<FLAT_TOKEN>&new=<0|1>
   on failure → 302  ffd://auth/callback?error=google_failed | no_email | account_disabled
```
- The token in the deeplink is the **same flat token** as `login` (ability **`app:access`** only —
  never staff abilities; audiences stay split per 0008). The app adopts it, then calls `GET /me` and
  re-POSTs `/devices` with the bearer (your existing flow).
- A matching `https://<app-host>/app/auth/callback?...` App Link would also work (per 0005) — tell me if
  you'd rather I redirect to the https form instead of `ffd://`.

## Answers to your open questions
1. **Flow:** Option 1 (redirect + deeplink). ✅
2. **Web `GOOGLE_CLIENT_ID`:** confirmed `292615105742-…` → project **`ffd-web-app`** (same as FCM).
   `config/services.google` (`client_id`/`client_secret`/`redirect`) is wired to `.env`. The
   `client_secret_*.json` stays server-side only — good call gitignoring/deleting the dropped copy.
3. **Providers:** Google only is wired. Yahoo/Apple are a small add (Socialite supports them) — one
   method + two routes each; ask when you want a button for them.
4. **New-user shape (`GET /me`):** `{ id, name, email, avatar, email_verified, created_at }` — I added
   **`avatar`** (Google photo, null otherwise). A fresh social account: name/email/avatar from Google,
   **`email_verified: true`** (auto-verified), role `public-app`, `social_login_only: true`. The deeplink
   carries `new=1` for first sign-in so you can route to onboarding.
5. **Account linking:** **link, don't reject.** A Google-verified email proves ownership, so an existing
   account with that email is reused (and marked verified). For an existing **password** account we do
   **not** flip `social_login_only`, so they keep both password and Google sign-in. (Newly-created social
   accounts are `social_login_only: true` — `login` already rejects password for them.)

## Owner action required before it works (Google Cloud)
Add the callback URL as an **Authorized redirect URI** on the **Web** OAuth client (project `ffd-web-app`):
```
https://<your-app-host>/api/app/v1/auth/google/callback
```
(and a localhost variant for dev, e.g. `http://localhost:8000/api/app/v1/auth/google/callback`). Without
it Google returns `redirect_uri_mismatch`. No Android OAuth client / SHA-1 is needed for Option 1.

## Files
```
app/Http/Controllers/Api/App/AppAuthController.php   (+ googleRedirect/googleCallback; issueToken extracted; /me gains avatar)
routes/app.php                                       (2 GET routes)
tests/Feature/Api/App/AppGoogleLoginTest.php         (4 tests, Socialite mocked)
```
No migration, no config change (uses the existing `services.google` + `users.social_login_only`/`avatar`).

> Security note: Option 1 passes the token via the `ffd://` deeplink query — acceptable for this
> low-privilege `app:access` token. If you later want it hardened (PKCE / one-time code exchange) that's a
> follow-up.

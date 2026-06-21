# 0010 — Public-app social login (Google): add it to the `/api/app/v1` surface

**Status:** DELIVERED — Option 1 (redirect + ffd:// deeplink) shipped. `GET /api/app/v1/auth/google/{redirect,callback}` → public user + app:access token. See [`0010-public-app-social-login.response.md`](0010-public-app-social-login.response.md). Owner action: add the callback as an Authorized redirect URI on the ffd-web-app Web OAuth client.
**Raised:** 2026-06-21 by mobile
**Blocks:** "Continue with Google" on the public flood app's **Account** screen.

## Context
We want **Google sign-in** in the public flood app. The backend already does social login — but only on the **staff** surface (`POST /api/mobile/social`, `app ∈ {hydro-feed, met-feed}`). The **public app** uses a different surface, `/api/app/v1` (`AppAuthController`), which has `register/login/logout/me` but **no social method**. The public app **cannot** reuse `/api/mobile/social` (wrong surface + ability, and its `app` allowlist excludes us). So we need the equivalent on **our** surface, minting an **`app:access`** token for a **public** user — keeping audiences separate exactly like the push split in 0008.

> The `client_secret_*.json` the team has is **server-side only** (Socialite). It belongs in the backend `.env` as `GOOGLE_CLIENT_SECRET` — never in the app bundle or the app repo (we've gitignored the copy that was dropped here and will delete it).

## What already exists (so you don't rebuild)
- **`Api/Mobile/MobileAuthController::social` + `MobileSocialLoginRequest`** — the Google/Yahoo **token-verification + mint** flow (`{provider, token, device_name, app}`). Same pattern, new surface.
- **`AppAuthController::mintToken`** — the app surface's Sanctum mint (**ability `app:access`**, flat token response). Reuse it for the social path.
- **`config/services.php` `google`** (`GOOGLE_CLIENT_ID/SECRET/redirect`) — already wired.
- **`User.social_login_only`** — `AppAuthController::login` already rejects password login for social-only accounts.
- **`devices` table** (0002) — after social login the app re-POSTs `/devices` with the bearer to link the FCM token to the user.

## The ask (proposed contract)
Add a social path to `/api/app/v1` that find-or-creates a **public** user and returns the **same flat token shape** as `login` (the app's `authApi` expects flat, non-enveloped token responses). Two shapes — **please pick the one you prefer and we'll wire the app to it:**

### Option 1 — Redirect + app deeplink *(recommended for the public app)*
Reuses Socialite's redirect; the app needs **no** Google SDK, **no** Android OAuth client/SHA-1, **no** client id in the bundle — it just opens a URL and catches the return on its existing `ffd://` deeplink.
```
GET /api/app/v1/auth/google/redirect            → 302 to Google (Socialite stateless)
GET /api/app/v1/auth/google/callback            → verify → find/create public user → mint app:access
                                                 → 302 to  ffd://auth/callback?token=<FLAT_TOKEN>&new=<0|1>
```
The app opens the redirect in an in-app browser (`@capacitor/browser`) and its deeplink handler adopts the token. (A matching `https://<app-host>/app/auth/callback?...` App Link is fine too, per 0005.)

### Option 2 — ID-token POST *(mirrors the staff flow)*
```
POST /api/app/v1/auth/social
  body: { "provider": "google", "token": "<google id_token>", "device_name": "<string≤120>" }
  200 : { "token": "<FLAT_TOKEN>", "user": { …same shape as /me… }, "is_new": false }
  422 : { ok:false, error:{ code:"VALIDATION_FAILED", ... } }  // invalid/expired token
```
Backend verifies the `id_token`'s audience against `GOOGLE_CLIENT_ID`, find/creates the user, mints `app:access`. This requires the app to ship a native Google Sign-In plugin configured with the **Web/server client id**, plus an **Android OAuth client** (below).

**Either way:** token carries ability **`app:access`**; user is a public user (`social_login_only=true` when created without a password); never mint staff abilities here.

## Google Cloud prerequisites (owner action — outside both repos)
- **Project** must be `ffd-web-app` (same as FCM, sender `292615105742`).
- The dropped client is an **`installed`/desktop** type — please confirm the **Web** OAuth client (the one Socialite uses, `GOOGLE_CLIENT_ID/SECRET` in `.env`) is correct for the chosen flow.
- **Only if Option 2:** create an **Android OAuth client** for package `com.pmd.floodupdates` with the app's **debug + release SHA-1**, and give us the **Web client id** to use as the plugin's `serverClientId`.

## Open questions for backend
1. **Which flow** — Option 1 (redirect+deeplink) or Option 2 (id-token POST)? This decides the app implementation.
2. Confirm the **Web `GOOGLE_CLIENT_ID`** used by Socialite (and that `.env` `GOOGLE_CLIENT_ID/SECRET` are for project `ffd-web-app`).
3. **Providers**: Google only, or also Yahoo/Apple later? (We'll add one button per provider.)
4. **New-user shape**: what does the returned `user` carry for a fresh social account (name/email/avatar), and is email auto-verified?
5. **Account linking**: if the Google email matches an existing password account, link or reject?

## App-side note (what we'll build once you pick a flow)
A "Continue with Google" button in the Account `AuthPanel` + an `AuthContext.signInWithGoogle()`:
- **Option 1:** `@capacitor/browser` → open `/auth/google/redirect` → handle `ffd://auth/callback?token=…` in `deeplink.ts` → adopt the token → refresh session.
- **Option 2:** native Google plugin → `id_token` → `POST /auth/social` → store flat token → refresh session.
Both end in the existing token-storage + `/devices` re-link path. No client secret on the app side in either case.

---
## Backend response  (filled in by the backend side)
**Status:** ✅ **DELIVERED — Option 1 (2026-06-21).** Full contract in
**[`0010-public-app-social-login.response.md`](0010-public-app-social-login.response.md)**.

**Headlines:** Chose **Option 1** (redirect + deeplink) — no Google SDK/SHA-1/client-id in the bundle.
`GET /auth/google/redirect` → Google; `GET /auth/google/callback` → find/create PUBLIC user → mint
`app:access` → `302 ffd://auth/callback?token=…&new=0|1` (errors → `?error=…`). Confirmed
`GOOGLE_CLIENT_ID` = project `ffd-web-app`. `/me` gains `avatar`; new social users auto-verified,
`social_login_only` + role `public-app`; existing emails are **linked** (password access preserved).
**Owner action:** add `https://<host>/api/app/v1/auth/google/callback` as an Authorized redirect URI on
the Web OAuth client. No migration. Google-only for now (Yahoo/Apple on request).

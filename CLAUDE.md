# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The **public FFD flood app** — a Capacitor + React (Vite) Android app for the Pakistan
Meteorological Department's Flood Forecasting Division. The public can view latest hydro
data, FFD bulletins, the active flood advisory, and an alerts inbox with **zero login**;
registered users curate a personal station watchlist and per-station alert prefs. Every
published message fans out to three channels at once — **FCM push + in-app inbox + WhatsApp**.

**Status: Phases 0–5 client-complete.** Full app built against the now-shipped `/api/app/v1`
surface (backend requests 0001–0005 all delivered): public read screens, anonymous push +
device registration, auth + watchlist + preferences + inbox, broadcast deep-linking + unread
badge, and release hardening (HTML sanitisation, error boundary, 429 handling, network-security
config, guarded signing). What remains is **device/Firebase verification** (can't run an APK in
this env) and external release steps — see `docs/RELEASE.md`. Verified by `npm run build` (strict
`tsc` + Vite) after every change; each phase was independently strict-reviewed before commit.

## The two-repo arrangement (read this first)

This is a **pure API client**. The backend is a *separate* Laravel 12 project and the source
of truth for all data, auth, and notifications:

- **This repo:** `E:\Websites\ffd-mobile-app` — the client. We build screens and consume endpoints.
- **Backend:** `E:\Websites\ffd-web-2026` — FFD Web 2026 (Laravel 12 / PHP 8.2 / MySQL 8). **Do not
  edit it from here.** It already powers the FFD website, the staff data-feed apps, and the
  PakFlood-DSS sync API.

**Cross-repo coordination — the `backend/` folder.** When the app needs something from the
server (new endpoint, schema change, a question), **do not reach into the backend repo**.
Drop a numbered request in [`backend/`](backend/README.md); the backend expert implements it
in their repo and writes the shipped contract back into the same file. Coordinate directly
only when a change must land on both sides simultaneously. Reuse before requesting — much of
the push/broadcast machinery already exists (see below).

## Canonical docs — start here, don't duplicate them

| Doc | Purpose |
|---|---|
| [`docs/FFD-App-WorkPlan.md`](docs/FFD-App-WorkPlan.md) | **The plan.** Locked decisions, data model, routes, screen spec, phases 0–5, broadcast lifecycle. |
| [`docs/BACKEND-INTEGRATION.md`](docs/BACKEND-INTEGRATION.md) | **The backend map.** What exists & is reusable, the API conventions our client must follow, the gap analysis. |
| [`docs/ffd-app-prototype.html`](docs/ffd-app-prototype.html) | The visual reference to build to (open in a browser). |
| [`backend/`](backend/README.md) | Outstanding requests to the backend team + the shipped contracts. |

## Non-obvious architecture facts (the things that save you a wrong turn)

- **Ours is a new, fourth API surface.** The backend already serves `/api/mobile` (staff,
  permission-gated), `/api/dss/v1` (machine-to-machine, keyed), and MDMS. **None fit a public
  client** — DSS keys can't ship in a public app; staff auth rejects public users. The public
  surface is proposed as `/api/app/v1` and is being built via `backend/0001-…`.
- **The backend already has the hard parts of notifications.** A working **FCM HTTP v1 sender**
  (`app/Services/Push/FcmService.php` — OAuth2-from-service-account, dead-token pruning) and a
  **flood-threshold state machine** that already auto-fires alerts on band escalation. The app's
  notification work is mostly *extending audience to the public*, not building delivery. Treat the
  work plan's "build FCM v1" / "build threshold trigger" steps as **already done** server-side.
- **Severity has six levels server-side, five in the prototype.** Backend enum:
  `NORMAL | LOW | MEDIUM | HIGH | VERY_HIGH | EX_HIGH`. The prototype shows five. Backend enum is
  canonical; map `EX_HIGH` into the top visual bucket. **Colours are app-owned** (prototype tokens),
  keyed off the backend `status` string — backend `status_color` values differ; don't use them.
- **Anonymous-first.** Register the device's FCM token and show the alerts feed/inbox *before* any
  login — `user_id` is nullable on device tokens. Login only gates personalization (watchlist, prefs).
- **One fan-out, never per-channel.** Every published item (bulletin, advisory, station alert) goes
  through a single `BroadcastService` so push, inbox, and WhatsApp stay consistent — a message read
  in one place is read everywhere. Don't wire a channel in isolation.
- **Offline-tolerant reads.** Cache the last successful payload per screen; the app should render
  stale-but-present data when the network is down.

## API conventions (enforced by the backend — match them in the client)

- Envelope: `{ "ok": true, "data": {…} }` or `{ "ok": false, "error": { "code", "message", "fields?" } }`.
  Auth-token responses are **flat** (not enveloped). Always send `Accept: application/json`.
- Auth: Sanctum **bearer tokens**, stateless (no cookies/CSRF).
- Error codes: `VALIDATION_FAILED` (422, with `error.fields`), `UNAUTHENTICATED` (401), `FORBIDDEN`
  (403), `NOT_FOUND` (404), `RATE_LIMITED` (429, honour `Retry-After`), `SERVER_ERROR` (500).
- Lists paginate by **opaque keyset cursor** (`data.meta.next_cursor`), never page numbers.
- Timestamps are ISO 8601 **with offset** (river data is `Asia/Karachi`) — parse the offset, never
  assume it. Discharge in **cusecs** (`Cs`), levels in metres, dam level in feet.

## Commands

```bash
npm install            # install deps
npm run dev            # Vite dev server (http://localhost:5173, also on LAN)
npm run typecheck      # tsc --noEmit  (the type gate; run before committing)
npm run build          # typecheck + vite build → dist/
npm run preview        # serve the production build locally

# Capacitor / Android
npm run cap:sync       # copy web build + plugins into the native project (run after every web build)
npm run android:open   # open the Android project in Android Studio
npm run android:run    # build + run on a device/emulator
```

There is no test runner or ESLint yet — `npm run typecheck` (strict TS) is the current gate.
Add Vitest + ESLint when the first real logic lands (Phase 1).

**Android build prerequisites (not installed in the current dev env):** generating the `android/`
project needs only Node, but *building/running the APK* needs a **JDK 17+** and the **Android SDK**
(install Android Studio; set `ANDROID_HOME`). Until then, develop against `npm run dev` in a browser
— the same bundle runs in the WebView. `firebase`/`google-services.json` is **not** committed
(gitignored) and is added in Phase 2 alongside push wiring.

> Note: `npm audit` flags 2 high advisories in `node-tar` — a transitive **dev-only** dep of
> `@capacitor/cli` (scaffold/build time, never in the shipped bundle). Don't `audit fix --force`
> it (downgrades the Capacitor CLI); revisit when Capacitor bumps the dep.

## Stack & layout

- **Vite + React 18 + TypeScript + Capacitor 6** (Android first; a `platform` field is carried so
  iOS/APNs is cheap later). HashRouter for in-WebView routing.
- Capacitor plugins wired: `push-notifications` (FCM), `preferences` (token + offline cache),
  `app`, `network`, `splash-screen`, `status-bar`. App id `com.pmd.floodupdates` (`capacitor.config.ts`).
- Five-tab bottom nav: **Home · Stations · Alerts · Bulletins · Account**. Watchlist (My Stations)
  is reached from Home/Account/station detail — not a top-level tab.

```
src/
  main.tsx · App.tsx          entry (ErrorBoundary) + AuthProvider/UnreadProvider + HashRouter routes
  auth/AuthContext.tsx        session (boot/refresh/login/register/logout) + device link/unlink
  state/UnreadContext.tsx     inbox unread count for the Alerts nav badge
  hooks/useResource.ts        loading/error/stale/reload state over cachedGet
  components/                 AppShell, BottomNav (+badge), PushManager, ScreenHeader,
                              StationRow, DischargeChart (SVG), FilterChips, Switch,
                              WatchlistControls, PublicationDetail, ErrorBoundary, ui (atoms)
  screens/                    Home, Stations(+Detail), Alerts, Bulletins(+Detail),
                              Advisory detail, Account, Watchlist, Preferences
  lib/
    api.ts        envelope-aware client + offline cachedGet() + 429/Retry-After
    endpoints.ts  all typed API calls (+ dev mock branch); mocks.ts dev fixtures
    auth.ts/authApi.ts/install.ts   token+user storage, §B auth calls, device_name
    devices.ts/push.ts              §C device registration + FCM lifecycle wrappers
    deeplink.ts/events.ts           ffd:// + https /app/ routing; app-wide DOM events
    severity.ts/format.ts/sanitize.ts/analytics.ts   enum→UI, formatting, DOMPurify, seam
    cache.ts/native.ts
  types/api.ts                AUTHORITATIVE client contract types (mirror backend responses)
  styles/                     tokens.css, global.css (shell), components.css
android/                      Capacitor Android project: ffd:// + App Link filters, network
                              security config, guarded release signing (docs/RELEASE.md)
```

- `src/types/api.ts` is the single client-side source of truth for API shapes — it mirrors the
  **shipped** backend contracts (`backend/000N-*.response.md`). Reconcile it there when a shape changes.
- Dev fixtures (`src/lib/mocks.ts`) render every screen without a backend: set `VITE_USE_MOCKS=1`
  (dev only — double-gated on `import.meta.env.DEV`, never in a production build).
- Follow the design system in `docs/BACKEND-INTEGRATION.md` §5 / the prototype (tokens, monospace
  "instrument readout" flow values, calm-authority teal, red reserved for severe levels).

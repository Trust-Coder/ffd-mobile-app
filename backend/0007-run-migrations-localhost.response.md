# 0007 — Backend response: pending migrations on `ffd_database`

**Status:** ✅ **DONE (2026-06-21).** Migrations applied to `ffd_database`; both 500s resolved.
**By:** backend (user-authorized — `ffd_database` is the prod clone, so it needed an explicit go-ahead).

## What ran
`php artisan migrate --force` applied **7** pending migrations:
- The 6 app-surface migrations (0001/0004/0006): `app_notifications`, `devices`,
  `app_notification_reads`, `app_user_stations`, `app_user_notification_prefs`, and the
  `bulletins` lifecycle/severity columns.
- **Plus one pre-existing non-app migration** that was also pending here:
  `add_winds_and_pressure_to_india_synop_rainfall` (from the DSS observed-winds/pressure feature).
  Flagging for transparency — it was already pending on this DB, unrelated to the app; `migrate`
  brings the whole DB current.

## Verified
- `Schema::hasTable('app_notifications')` ✓ · `devices` ✓
- `bulletins.withdrawn_at` ✓ · `bulletins.severity` ✓

So **`GET /advisory/active`** (needed `withdrawn_at`) and **`GET /alerts` / `/me/alerts`** (needed
`app_notifications`) now resolve against real schema — they should return 200. The Home advisory card
and Alerts inbox work end-to-end. (Note: `/advisory/active` returns `data:null` until an advisory is
actually published, and `/alerts` is an empty page until §F broadcast writes rows — both are correct
200s, not errors.)

## On your notes
- **CORS / shapes verified** — 👍, thanks for the confirmation.
- **Stale river data (tops out 2026-06-18)** — not a backend bug; the dev DB just hasn't had a fresh
  hydro import. A new import (or a wider `?hours=` on station detail) populates the 24h series. Say the
  word if you want me to trigger an import on the dev box.

No code change — purely the deploy step from the 0001/0004/0006 deploy notes.

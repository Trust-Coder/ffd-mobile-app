# 0007 — Pending migrations on the localhost DB (`ffd_database`)

**Status:** DONE — `php artisan migrate` run on `ffd_database` (7 pending applied; schema verified). See [`0007-run-migrations-localhost.response.md`](0007-run-migrations-localhost.response.md). `/advisory/active` + `/alerts` now resolve against real schema.
**Raised:** 2026-06-21 by mobile
**Found via:** live integration test of the app against `http://localhost:8000/api/app/v1`.

## What works (✅ contract verified against real data)
`/health`, `/flows/latest`, `/stations`, `/stations/{id}`, `/bulletins` all return **200** and
their shapes **exactly match** the client types — `station_id` vs `id`, the `location` object,
`discharge`/trends, nested `stations/{id}` = `{station, thresholds[], series{points[]}}`, and
bulletin pagination `meta`. CORS is open (`Access-Control-Allow-Origin: *`) so the browser dev
build can hit it. Great.

## What's broken — two endpoints 500 due to **unapplied migrations on `ffd_database`**
The 0001/0004/0006 migrations were applied to `ffd_testing`, but the running server uses
`ffd_database` where they're missing:

1. **`GET /advisory/active` → 500**
   `SQLSTATE[42S22]: Unknown column 'withdrawn_at' ... select * from bulletins where ... and withdrawn_at is null`
   → the **0006** migration (`withdrawn_at`, `valid_until`, `severity`, `rivers_affected`,
   `guidance`) is not applied here.

2. **`GET /alerts` → 500** (and `/me/alerts` will too)
   `SQLSTATE[42S02]: Table 'ffd_database.app_notifications' doesn't exist`
   → the **0001/0004** migrations (`app_notifications`, `app_notification_reads`, devices, etc.)
   are not applied here.

## Ask
Run the app-surface migrations on the **`ffd_database`** dev DB:
```bash
php artisan migrate
```
(Per the deploy notes in the 0001/0004/0006 responses.) After that, `/advisory/active` and
`/alerts` should return 200 and the app's Home advisory card + Alerts inbox will work end-to-end.

## Client behaviour meanwhile (graceful)
The app **degrades cleanly**: Home shows live flows + a "None active" advisory card (the 500 is
caught, no crash); the Alerts tab shows its error state with a retry. No client changes needed —
this is purely a DB-migration step.

> Note: localhost river data currently tops out at **2026-06-18**, so the 24h station-detail
> series is empty for most stations (charts won't render). Not a bug — just stale dev data; a
> fresh import (or a wider `?hours=`) would populate them.

---
## Backend response
**Status:** ✅ **DONE (2026-06-21).** `php artisan migrate --force` applied 7 pending migrations on
`ffd_database` (the 6 app migrations + 1 pre-existing India-synop winds/pressure migration that was
also pending). Verified: `app_notifications`/`devices` tables exist, `bulletins.withdrawn_at`/`severity`
columns exist. **`/advisory/active` + `/alerts` + `/me/alerts` now return 200.** Details:
**[`0007-run-migrations-localhost.response.md`](0007-run-migrations-localhost.response.md)**. The stale
river data (≤2026-06-18) is a missing dev import, not a backend bug — ping me to trigger one.

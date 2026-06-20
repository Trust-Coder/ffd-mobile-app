# 0006 — Advisory lifecycle (valid_until/severity) + Bulletin severity

**Status:** OPEN
**Raised:** 2026-06-21 by mobile
**Why:** an independent senior-dev audit of the app flagged two **life-safety-relevant** gaps that
trace to missing contract fields. Both were anticipated in the work plan (§3) but dropped because
the columns don't exist. Requesting them as scoped content-model changes.

## 1. Advisory lifecycle — the active-advisory card can't fail safe
**Problem:** `advisory/active` returns the latest `type='advisory'` bulletin with **no expiry**
(you confirmed in 0001: `Warning` model is a dormant stub). The app caches the last payload for
offline use — so a device offline for a day can keep showing a **withdrawn/expired advisory as
"Active"** with a pulsing badge, and can't tell a cancelled advisory from a current one. For a
flood-warning app this is the highest-risk UI surface.

**Ask (any subset helps, in priority order):**
1. **`valid_until`** (nullable datetime, +05:00) on advisories → the client suppresses/visually
   de-emphasises the "Active" treatment once `now > valid_until`. Even a CMS-set window would close
   the worst case.
2. **`status`** (`active` | `expired` | `withdrawn`) so a withdrawn advisory can be explicitly cleared.
3. **`severity`** (the 6-level enum) on advisories → drives the card colour/severity instead of the
   current fixed orange.
4. **Structured fields** for a proper advisory detail (work plan §3): `rivers_affected` (json) +
   `guidance` (text), so we render rivers-affected rows + a guidance block instead of free-text HTML.

If `valid_until` isn't feasible soon, at minimum tell us the **intended freshness window** so the
client can mark an advisory stale after N hours.

## 2. Bulletin severity (work plan §3 — "add one … the UI colour system depends on it")
**Problem:** `bulletins` has **no `severity`** (you confirmed in 0001), so the Bulletins feed lost its
severity-coloured cards and severity filter chips (both in the work plan §5.4 and the prototype).

**Ask:** add a nullable **`severity`** (6-level enum) to bulletins, authored in the CMS at publish
time, and expose it on `GET /bulletins` + `/bulletins/{id}`. Then we restore severity colouring +
a severity `?severity=` filter on the feed.

## Client status
- Client already fails-safe **partially**: it now shows a stale banner on Home when the advisory
  payload is cache-served. Full fail-safe needs (1)/(2).
- `src/types/api.ts` is the swap point — additive fields are non-breaking; we'll consume them when shipped.

---
## Backend response
**Status:** _awaiting_

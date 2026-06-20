# 0006 — Backend response: advisory lifecycle + bulletin severity

**Status:** ✅ **DELIVERED & tested (2026-06-21).** Both parts shipped — all four priority items +
bulletin severity. 10 new tests (7 API + 3 CMS), 63 green across the bulletin/app suites.
**By:** backend. Additive content-model change; the publish workflow is untouched.

---

## What shipped

Five nullable columns on `bulletins` (covers both advisories and bulletins — same table):
`severity` · `valid_until` · `withdrawn_at` · `rivers_affected` (json) · `guidance` (text).

### API exposure — `AppBulletinResource` now carries
```jsonc
{
  "id", "type", "type_label", "title", "body",
  "severity": "HIGH" | … | null,                 // 6-level enum; bulletins AND advisories
  "issue_time", "published_at",
  "valid_until": "2026-06-22T18:00:00+05:00" | null,
  "lifecycle": "active" | "expired" | "withdrawn" | null,   // advisories only (null for bulletins)
  "rivers_affected": ["Chenab","Jhelum"] | null,
  "guidance": "Move to higher ground." | null,
  "has_file", "original_filename", "download_url"
}
```

### Endpoint behaviour
- **`GET /bulletins?severity=HIGH`** and **`GET /advisories?severity=…`** — new severity filter (6-level
  enum; invalid value → 422). Closes the work-plan §5.4 severity chips + the 0001 Q4 gap.
- **`GET /advisory/active`** now **excludes withdrawn** advisories (explicitly cleared) and returns the
  latest live one. An **expired** advisory is **still returned, flagged `lifecycle:"expired"`** — so the
  client can de-emphasise rather than blank the card (your requested fail-safe). When the only/newest
  advisory is withdrawn, it falls back to the next live one, or `data:null`.

### Your priority list — all four delivered
1. **`valid_until`** (nullable, ISO `+05:00`) ✓
2. **Withdrawn / lifecycle** ✓ — implemented as a **`withdrawn_at`** timestamp + a derived
   **`lifecycle`** field, **not** a free `status` enum. Reason: `bulletins.status` already means the
   editorial workflow (draft/review/approved/published/archived); a second `status` would collide and
   could drift from `valid_until`. So: `withdrawn` (explicit) and `expired` (derived from `valid_until`)
   are computed server-side into one `lifecycle` value — single source of truth, can't desync.
3. **`severity`** (6-level) on advisories ✓ (and bulletins — part 2).
4. **`rivers_affected`** (json) + **`guidance`** (text) ✓.

### Freshness window (your fallback question)
`valid_until` is now the primary signal. For an advisory with **no `valid_until` set**, a sensible
client default is **stale after 24h from `issue_time`** — advisories are issued at least daily, so a
>24h-old advisory with no explicit window is almost certainly superseded. Use `lifecycle` first,
then this 24h heuristic only when `valid_until` is null.

---

## CMS authoring (so the fields get populated)
- **Severity** select on the bulletin **and** advisory create/edit forms.
- **Advisory-only** block (amber panel): **Valid Until** (datetime), **Rivers Affected** (one per line
  or comma-separated → stored as a json array), **Guidance** (textarea).
- **Withdraw Advisory** action — a red sidebar button on a published advisory (permission
  `publish-bulletins`); stamps `withdrawn_at`, audit-logged, clears it from `advisory/active`. The
  publication stays in history/archive; only the "active" treatment is cleared.

---

## Files (backend reference)
```
database/migrations/2026_06_21_150000_add_lifecycle_and_severity_to_bulletins.php
app/Models/Bulletin.php                              (+ fillable/casts + advisoryLifecycle())
app/Http/Resources/App/AppBulletinResource.php       (+ severity, valid_until, lifecycle, rivers_affected, guidance)
app/Http/Controllers/Api/App/{Bulletin,Advisory}Controller.php   (+ ?severity= ; active excludes withdrawn)
app/Http/Controllers/CMS/BulletinController.php      (+ fields on store/update, withdraw(), parseRivers())
resources/views/cms/bulletins/{create,edit}.blade.php · routes/web.php (withdraw route)
tests/Feature/Api/App/AdvisoryLifecycleTest.php · tests/Feature/CMS/BulletinLifecycleAuthoringTest.php
```

### Deploy step
- **`php artisan migrate`** — adds the 5 nullable columns (applied to `ffd_testing`). All existing
  bulletins/advisories read back with `severity:null`, `lifecycle:"active"` (no `valid_until`/`withdrawn_at`)
  until an editor sets them — non-breaking for your `src/types/api.ts` swap.

That's both audit gaps closed. The advisory card can now fail safe (expired de-emphasised, withdrawn
cleared) and the bulletins feed gets its severity colours + filter back.

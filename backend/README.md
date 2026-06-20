# Backend Requests — cross-repo coordination

This folder is the **handoff queue between the mobile app and the backend**. The two
codebases are worked on by different experts in different repos:

- **This repo** (`E:\Websites\ffd-mobile-app`) — the public FFD flood app (client).
- **Backend** (`E:\Websites\ffd-web-2026`) — the FFD Laravel platform (server of record).

Each expert owns its own domain. When the mobile side needs something from the server
(a new endpoint, a schema change, a field added, a question answered), we **drop a
request file here** instead of reaching into the backend repo. A human/agent on the
backend side picks it up, implements it there, and writes the outcome back into the
same file. We coordinate directly only when a change spans both sides at once.

## How to use it

1. **Create a request:** add `NNNN-short-slug.md` (zero-padded, increment from the last).
   Use the template below. Be precise about the **contract** (routes, request/response
   JSON, auth, error codes) — the backend agent should be able to build from it without
   guessing, and the client should be able to code against it before it ships.
2. **State what already exists.** Before asking for anything, check
   [`../docs/BACKEND-INTEGRATION.md`](../docs/BACKEND-INTEGRATION.md) — much of the
   broadcast/push machinery is already built. Ask for the gap, not the whole thing.
3. **Status lives in the file header.** `OPEN` → `IN PROGRESS` → `DELIVERED` (with the
   backend agent's notes / final contract) → we mark `VERIFIED` once the client integrates.
4. **One concern per file** where practical. Big efforts (like the kickoff) may bundle a
   numbered checklist.

## Index

| # | File | Title | Status |
|---|---|---|---|
| 0001 | [`0001-public-api-kickoff.md`](0001-public-api-kickoff.md) | Public app API surface — read, auth, devices, inbox, broadcast | OPEN |

## Request template

```markdown
# NNNN — <title>

**Status:** OPEN
**Raised:** <YYYY-MM-DD> by mobile
**Blocks:** <which app phase/screen this gates, or "nothing yet">

## Context
<why we need this; link the screen/phase in docs/FFD-App-WorkPlan.md>

## What already exists (so you don't rebuild)
<cite docs/BACKEND-INTEGRATION.md — services/models/jobs to reuse>

## The ask (proposed contract)
<routes, request/response JSON, auth, error codes, pagination — our proposal; adjust freely>

## Open questions for backend
<decisions only the backend owner can make>

---
## Backend response  (filled in by the backend side)
**Status:** …
<final contract as shipped, file paths, deviations from our proposal, migration notes>
```

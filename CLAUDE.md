# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start Next.js dev server (localhost:3000)
npm run build        # production build
npm test             # run Vitest unit tests (14 tests)
npm run test:watch   # Vitest in watch mode
npm run test:imap    # connect to IMAP, list last 20 emails, mark matches (needs .env.local)
npm run test:parser  # download first matching email and print per-section parse counts
npm run test:sections # run all section parser unit tests (no IMAP needed)
npx tsx scripts/save-email-html.ts    # save latest report email HTML to data/debug-email.html
npx tsx scripts/save-email-html.ts <UID>  # save specific email by IMAP UID
```

Always run `npx tsc --noEmit` after changes. Tests live in `tests/lib/` and `tests/api/`.

## Environment

Copy `.env.example` to `.env.local`. Required variables:

```
IMAP_HOST / IMAP_PORT / IMAP_SECURE / IMAP_USER / IMAP_PASS  # IMAP access
AUTH_SECRET          # generate: openssl rand -base64 32
GOOGLE_CLIENT_ID     # Google Cloud OAuth 2.0 credentials (for Search Console)
GOOGLE_CLIENT_SECRET
NEXTAUTH_URL         # full app URL (default: http://localhost:3000)
BLOB_READ_WRITE_TOKEN  # Vercel Blob — omit for local filesystem storage
```

Default dev login: **admin / admin** (bootstrapped automatically on first start).

## Architecture

The app requires login (NextAuth credentials). Users are stored in `data/users.json` (or Vercel Blob). Default admin: **admin/admin** — change after first login in production.

The app reads HTML report emails from IMAP, parses them into structured JSON, persists them, and renders a dashboard.

### Data flow

```
IMAP inbox
  → lib/imap.ts            (ImapFlow + mailparser — fetches/lists emails)
  → lib/parser.ts          (dispatch entry point — routes to per-type parser)
      → lib/parser.ts              (obchodní: Cheerio HTML, sec1–sec15)
      → lib/parser-skladovy.ts     (skladový: plain-text line-by-line, sk_sec1–sk_sec8)
      → lib/parser-ucetni.ts       (účetní: plain-text line-by-line, uc_sec1–uc_sec4)
      → lib/parser-masterdata.ts   (masterdata: plain-text line-by-line, md_sec1–md_sec12)
      → lib/parser-localization.ts (localization: plain-text line-by-line, lc_sec1–lc_sec7)
  → lib/storage.ts         (dual backend: Vercel Blob / ./data/)
  → app/dashboard/         (server component loads from storage, passes to client)
```

### Report types

`lib/report-types.ts` defines `REPORT_TYPES` (currently five: `obchodni`, `skladovy`, `ucetni`, `masterdata`, `localization`). Each type has:
- `subjectKeyword` — ASCII-safe string for IMAP server-side `SEARCH SUBJECT`
- `matchSubject` — client-side precise filter applied after IMAP results

The tab bar in the dashboard header iterates `REPORT_TYPES` automatically — adding a type there is sufficient for the tab to appear.

**Adding a new report type checklist:**
1. Add entry to `REPORT_TYPES` in `lib/report-types.ts`
2. Add section interfaces to `types/report.ts`, extend `ReportKPI` and `ReportSections` with optional fields (prefixed to avoid collision)
3. Create `lib/parser-<type>.ts` with a `parse<Type>Email(html, date, fetchedAt): Report` function
4. Add dispatch in `lib/parser.ts` `parseReportEmail`
5. Create section components under `components/sections/` (lazy-loaded)
6. Add a `kpiChips<Type>` array and a conditional render block in `DashboardClient.tsx`

### Parsers

**`lib/parser.ts`** (obchodní) — Cheerio HTML parser. Uses `findHeading($, patterns)` to locate section headings (`h1–h5, strong, b, td[colspan], th`), then `collectSectionContent` to gather sibling elements, then `findTable` / `findBulletLines` to extract data. Each `parseSection*` function is wrapped in try/catch so failures are isolated.

**`lib/parser-skladovy.ts`** (skladový) — plain-text email. Sections are separated by `## ` Markdown headings (or short lines matching known patterns). Extracts lines from HTML via cheerio (replaces `<br>` with `\n`, converts tables to pipe-separated lines), then runs a state-machine through the line list.

**`lib/parser-ucetni.ts`** (účetní) — plain-text email. No `## ` headings; sections detected by content patterns (`/^celkem přijatých faktur:/i` etc.). A two-pass split first divides lines into named chunks, then each chunk is parsed individually. Block 3 contains two sub-sections (nevykryté / nadměrně vykryté) detected within the same chunk.

**`lib/parser-masterdata.ts`** (masterdata) — plain-text email. Same `htmlToLines` extraction as skladový (cheerio, `<br>`→`\n`, tables→pipe-separated). Sections split on `## ` headings. Links preserved as `[text](url)` markdown before stripping HTML so they survive into parsed output.

**`lib/parser-localization.ts`** (localization) — plain-text email. Same `htmlToLines` approach as masterdata. Sections split on `## ` headings; some subsections use indented bullet patterns within a section block.

**Parser debugging workflow:**
1. `npx tsx scripts/save-email-html.ts [UID]` → saves raw HTML to `data/debug-email.html`
2. Inspect headings/content in browser
3. Update patterns in the relevant parser
4. `npx tsx scripts/test-sections.ts` to verify

### Storage

`lib/storage.ts` checks `BLOB_READ_WRITE_TOKEN` at runtime:
- Set → Vercel Blob (`access: 'private'`, `allowOverwrite: true`)
- Local dev → `./data/reports/<date>.json` with index at `./data/index.json`
- Vercel without token → `/tmp` (ephemeral, lost on cold start)

### API routes

All routes use `runtime = 'nodejs'` (required for `imapflow`/`mailparser`).

- `POST /api/fetch-report` — `{ uid, reportType }` → fetches from IMAP, parses, saves, returns full `Report`. Client displays directly from response (no DB round-trip).
- `GET /api/emails?type=X` — lists last 10 matching emails (envelope only, no body).
- `GET /api/reports/[date]` — loads a saved report from storage.
- `GET /api/reports/[date]/export?section=N` — CSV export (obchodní sections 1–15).
- `GET /api/reports` — returns full storage index (all saved report entries).
- `GET /api/debug/storage` — storage health check (write/read round-trip).
- `GET /api/debug/parse?uid=XXX` — fetches email and returns headings/tables for parser debugging.
- `GET /api/admin/users` — list users (admin only). `POST/PATCH/DELETE` — create/update/delete user.
- `GET /api/google/connect` — initiate Google OAuth for Search Console.
- `GET /api/google/callback` — OAuth callback, saves tokens to user record.
- `GET /api/search-console/sites` — list GSC sites for authenticated Google account.
- `GET /api/search-console/errors?site=<url>` — get 404/500 errors for a site (24h cache). Add `&refresh=1` to force re-check.

### Client architecture

`DashboardClient.tsx` owns all interaction state:
- `liveReport` — set from POST response to avoid a DB round-trip after fetching
- `selectedEmail` / `fetching` / `fetchError` — drives the three main-area states
- `storedEmailUid` — UID for the currently-viewed stored report; enables "Znovu stáhnout"

**Email navigation:** clicking a "v DB" email navigates directly via `router.push` (no load card). Clicking an unsaved email shows the fetch card. "Znovu stáhnout" forces re-fetch/re-parse.

**Per-type rendering:** the main content area branches on `activeType`:
```
activeType === 'ucetni'       → KpiChipsUcetni      + UcSec1–4 collapsibles
activeType === 'skladovy'     → KpiChipsSkladovy    + SkSec1–8 collapsibles
activeType === 'masterdata'   → KpiChipsMasterdata  + MdSec1–12 collapsibles
activeType === 'localization' → KpiChipsLocalization + LcSec1–7 collapsibles
default (obchodni)            → KpiChips            + Section1–15 collapsibles
```
Each report type has its own `kpiChips*` array (defined inline in `DashboardClient`) and KPI fields prefixed in `ReportKPI` (`sk_*`, `uc_*`, `md_*`, `lc_*`). Delta indicators are green when value decreases (lower = better for all current types).

**Shared section utilities:**
- `useTableFilter` — text search over a list of objects by specified keys
- `useTableSort` — column sort with Czech locale collation
- `StatBars` — horizontal bar chart from `Record<string, number>`; pass `title` prop (not `label`)
- `CollapsibleSection` — wrapper with badge and green "V pořádku" empty state; badge = 0 renders green
- `MdmWorkflowBlock` — shared block used across MdSec and LcSec components for workflow/task display

`EmailBrowser.tsx` is a pure listing component — emits `onEmailClick`, receives `selectedUid`/`loadedUids`. No fetching logic.

### Compare page

`/dashboard/compare` loads up to 30 index entries and selected report JSONs server-side, passes them to `CompareClient.tsx`. Shows a KPI delta table and product presence matrices for sec1/sec13/sec14 (obchodní only).

### Section component naming

| Report | Prefix | Files |
|--------|--------|-------|
| Obchodní | `Section` | `Section1.tsx` – `Section15.tsx` |
| Skladový | `SkSec` | `SkSec1.tsx` – `SkSec8.tsx` |
| Účetní | `UcSec` | `UcSec1.tsx` – `UcSec4.tsx` |
| MasterData | `MdSec` | `MdSec1.tsx` – `MdSec12.tsx` |
| Lokalizace | `LcSec` | `LcSec1.tsx` – `LcSec7.tsx` |

All section components receive `data` (typed section) and `date` (report date `YYYY-MM-DD`) props. Some obchodní sections also accept `reportDate` (same value, kept for legacy reasons).

### Auth & user management

`lib/auth.config.ts` — edge-compatible NextAuth config (no bcrypt); used by `middleware.ts`. `lib/auth.ts` — full config with Credentials provider; used in server components and API routes via `auth()`.

`lib/users.ts` — CRUD over `data/users.json` (or `users/data.json` in Blob). Bootstraps **admin/admin** on first call if the file doesn't exist. Guards: can't delete/demote last admin. Stores Google OAuth tokens per user for Search Console.

`middleware.ts` — protects all routes except `/auth/*` and `/api/auth/*`. Logged-in users are redirected from `/auth/login` → `/dashboard`.

Role check in pages/API: `(session.user as { role?: string }).role === 'admin'`. Admin-only pages redirect non-admins to `/dashboard`.

### Google Search Console section

`/dashboard/search-console` — standalone page (not a report type). Requires a connected Google account (stored per-user via `/api/google/connect` → OAuth → `/api/google/callback`).

`lib/search-console.ts` — Google OAuth helpers + GSC API calls:
- `listGscSites(tokens)` — uses `google.webmasters.v3.sites.list`
- `getOrRefreshErrors(tokens, siteUrl)` — fetches sitemap URLs, batch-inspects via `searchconsole.v1.urlInspection.index.inspect`, checks `pageFetchState` for `NOT_FOUND`/`SOFT_404`/`SERVER_ERROR`
- Results cached 24h in `data/gsc-cache/` (or Blob at `gsc-cache/`)

The URL Inspection API is limited to **2000 requests/day per property**. The implementation caps at 300 URLs per site. Token refresh is handled automatically by the `google.auth.OAuth2` client.

**Setup for Google OAuth:** create credentials at Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID → add redirect URI `<NEXTAUTH_URL>/api/google/callback`. Enable "Google Search Console API" in the project.

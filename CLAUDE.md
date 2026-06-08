# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start Next.js dev server (localhost:3000)
npm run build        # production build
npm run test:imap    # connect to IMAP, list last 20 emails, mark matches (needs .env.local)
npm run test:parser  # download first matching email and print per-section parse counts
npx tsx scripts/test-sections.ts      # run all section parser unit tests (no IMAP needed)
npx tsx scripts/save-email-html.ts    # save latest report email HTML to data/debug-email.html
npx tsx scripts/save-email-html.ts <UID>  # save specific email by IMAP UID
```

There are no automated tests. TypeScript is the primary correctness check — always run `npx tsc --noEmit` after changes.

## Environment

Copy `.env.example` to `.env.local` and fill in `IMAP_PASS`. On Vercel, also set `BLOB_READ_WRITE_TOKEN` for persistent storage.

```
IMAP_HOST / IMAP_PORT / IMAP_SECURE / IMAP_USER / IMAP_PASS
BLOB_READ_WRITE_TOKEN   # Vercel Blob private store — omit for local filesystem storage
```

## Architecture

The app reads HTML report emails from IMAP, parses them into structured JSON, persists them, and renders a dashboard.

### Data flow

```
IMAP inbox
  → lib/imap.ts            (ImapFlow + mailparser — fetches/lists emails)
  → lib/parser.ts          (dispatch entry point — routes to per-type parser)
      → lib/parser.ts           (obchodní: Cheerio HTML, sec1–sec15)
      → lib/parser-skladovy.ts  (skladový: plain-text line-by-line, sk_sec1–sk_sec8)
      → lib/parser-ucetni.ts    (účetní: plain-text line-by-line, uc_sec1–uc_sec4)
  → lib/storage.ts         (dual backend: Vercel Blob / ./data/)
  → app/dashboard/         (server component loads from storage, passes to client)
```

### Report types

`lib/report-types.ts` defines `REPORT_TYPES` (currently three: `obchodni`, `skladovy`, `ucetni`). Each type has:
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
- `GET /api/debug/storage` — storage health check (write/read round-trip).
- `GET /api/debug/parse?uid=XXX` — fetches email and returns headings/tables for parser debugging.

### Client architecture

`DashboardClient.tsx` owns all interaction state:
- `liveReport` — set from POST response to avoid a DB round-trip after fetching
- `selectedEmail` / `fetching` / `fetchError` — drives the three main-area states
- `storedEmailUid` — UID for the currently-viewed stored report; enables "Znovu stáhnout"

**Email navigation:** clicking a "v DB" email navigates directly via `router.push` (no load card). Clicking an unsaved email shows the fetch card. "Znovu stáhnout" forces re-fetch/re-parse.

**Per-type rendering:** the main content area branches on `activeType`:
```
activeType === 'ucetni'   → KpiChipsUcetni   + UcSec1–4 collapsibles
activeType === 'skladovy' → KpiChipsSkladovy + SkSec1–8 collapsibles
default (obchodni)        → KpiChips         + Section1–15 collapsibles
```
Each report type has its own `kpiChips*` array (defined inline in `DashboardClient`) and KPI fields prefixed in `ReportKPI` (`sk_*`, `uc_*`). Delta indicators are green when value decreases (lower = better for all current types).

**Shared section utilities:**
- `useTableFilter` — text search over a list of objects by specified keys
- `useTableSort` — column sort with Czech locale collation
- `StatBars` — horizontal bar chart from `Record<string, number>`; pass `title` prop (not `label`)
- `CollapsibleSection` — wrapper with badge and green "V pořádku" empty state; badge = 0 renders green

`EmailBrowser.tsx` is a pure listing component — emits `onEmailClick`, receives `selectedUid`/`loadedUids`. No fetching logic.

### Compare page

`/dashboard/compare` loads up to 30 index entries and selected report JSONs server-side, passes them to `CompareClient.tsx`. Shows a KPI delta table and product presence matrices for sec1/sec13/sec14 (obchodní only).

### Section component naming

| Report | Prefix | Files |
|--------|--------|-------|
| Obchodní | `Section` | `Section1.tsx` – `Section15.tsx` |
| Skladový | `SkSec` | `SkSec1.tsx` – `SkSec8.tsx` |
| Účetní | `UcSec` | `UcSec1.tsx` – `UcSec4.tsx` |

All section components receive `data` (typed section) and `date` (report date `YYYY-MM-DD`) props. Some obchodní sections also accept `reportDate` (same value, kept for legacy reasons).

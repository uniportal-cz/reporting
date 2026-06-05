# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start Next.js dev server (localhost:3000)
npm run build        # production build
npm run test:imap    # connect to IMAP, list last 20 emails, mark matches (needs .env.local)
npm run test:parser  # download first matching email and print per-section parse counts
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
  → lib/imap.ts          (ImapFlow + mailparser — fetches/lists emails)
  → lib/parser.ts        (Cheerio HTML parser — extracts structured sections)
  → lib/storage.ts       (dual backend: Vercel Blob when BLOB_READ_WRITE_TOKEN set, else ./data/)
  → app/dashboard/       (server component loads from storage, passes to client)
```

### Storage backend switching

`lib/storage.ts` checks `BLOB_READ_WRITE_TOKEN` at runtime. Vercel Blob uses `access: 'private'` and `allowOverwrite: true`. Local dev writes to `./data/reports/<date>.json` with an index at `./data/index.json`. On Vercel without the token, `/tmp` is used (ephemeral — lost on cold start).

### Report types

`lib/report-types.ts` defines `REPORT_TYPES`. Each type has:
- `subjectKeyword` — ASCII-safe string for IMAP server-side `SEARCH SUBJECT` (fast, approximate)
- `matchSubject` — client-side function for precise filtering after IMAP results

When adding a new report type, add it to `REPORT_TYPES` and add the corresponding section interfaces to `types/report.ts`, section components under `components/sections/`, and wire them into `DashboardClient.tsx`.

### API routes

All routes use `runtime = 'nodejs'` (required for `imapflow` / `mailparser` which use Node.js native APIs — they are listed in `serverComponentsExternalPackages` in `next.config.js`).

- `POST /api/fetch-report` — accepts `{ uid, reportType }`, fetches email from IMAP by UID, parses it, saves to storage, returns the full `Report` object. The client displays from the response directly (no DB round-trip).
- `GET /api/emails?type=X` — lists last 10 matching emails from IMAP (envelope only, no body download).
- `GET /api/reports/[date]` — loads a saved report from storage.
- `GET /api/debug/storage` — storage health check with write/read round-trip.
- `GET /api/debug/parse?uid=XXX` — fetches email HTML and returns headings/tables for parser debugging.

### Parser

`lib/parser.ts` uses Cheerio to parse the email HTML heuristically. It searches for section headings by regex patterns, then extracts the nearest table. Each section is wrapped in its own try/catch so a parse failure in one section doesn't break others. The parser was built without access to live email samples — use `/api/debug/parse?uid=XXX` with a real UID to inspect heading text and table structure when fixing parse issues.

### Client architecture

`DashboardClient.tsx` owns all interaction state:
- `liveReport` — set from POST response immediately, avoiding a DB round-trip after loading
- `selectedEmail` / `fetching` / `fetchError` — drives the three main-area states (report / ready-to-load card / loading animation)

`EmailBrowser.tsx` is a pure listing component — it emits `onEmailClick` and receives `selectedUid` / `loadedUids` from the parent. It has no fetching logic.

Section components (`components/sections/Section*.tsx`) are lazy-loaded and only rendered when the collapsible is opened. Each section is always rendered in `DashboardClient` — empty sections show a green "V pořádku" state instead of being hidden.

### Compare page

`/dashboard/compare` loads up to 30 index entries and selected report JSONs server-side, passes them to `CompareClient.tsx`. The compare view shows a KPI delta table and product presence matrices for sec1/sec13/sec14.

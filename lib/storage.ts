import { Report, ReportIndex } from '@/types/report'

// Use Vercel Blob when token is available, otherwise filesystem
// On Vercel without Blob: use /tmp (writable, ephemeral per cold start)
const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN
const DATA_BASE = process.env.VERCEL === '1' ? '/tmp' : process.cwd()

// ─── Filesystem backend (local dev / Vercel /tmp) ───────────────────────────

function fsBackend() {
  const fs = require('fs') as typeof import('fs')
  const path = require('path') as typeof import('path')
  const DATA_DIR = path.join(DATA_BASE, 'data', 'reports')
  const INDEX_FILE = path.join(DATA_BASE, 'data', 'index.json')

  return {
    saveReport(report: Report): void {
      fs.mkdirSync(DATA_DIR, { recursive: true })
      fs.writeFileSync(path.join(DATA_DIR, `${report.date}.json`), JSON.stringify(report, null, 2), 'utf8')
      const index = this.loadIndex()
      const existing = index.reports.findIndex((r) => r.date === report.date && r.reportType === report.reportType)
      const entry = { date: report.date, reportType: report.reportType, kpi: report.kpi }
      if (existing >= 0) index.reports[existing] = entry
      else index.reports.push(entry)
      index.reports.sort((a, b) => (a.date < b.date ? 1 : -1))
      fs.mkdirSync(path.dirname(INDEX_FILE), { recursive: true })
      fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf8')
    },
    loadReport(date: string): Report | null {
      const filePath = path.join(DATA_DIR, `${date}.json`)
      if (!fs.existsSync(filePath)) return null
      try { return JSON.parse(fs.readFileSync(filePath, 'utf8')) } catch { return null }
    },
    loadIndex(): ReportIndex {
      if (!fs.existsSync(INDEX_FILE)) return { reports: [] }
      try { return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')) } catch { return { reports: [] } }
    },
  }
}

// ─── Vercel Blob backend ─────────────────────────────────────────────────────

const BLOB_INDEX = 'reports/index.json'
const blobReportPath = (date: string) => `reports/${date}.json`

async function blobGet(pathname: string): Promise<string | null> {
  try {
    const { get } = await import('@vercel/blob')
    const result = await get(pathname, { access: 'private' })
    if (!result || result.statusCode !== 200 || !result.stream) return null
    return new Response(result.stream).text()
  } catch { return null }
}

async function blobPut(pathname: string, content: string): Promise<void> {
  const { put } = await import('@vercel/blob')
  await put(pathname, content, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' })
}

async function blobLoadIndex(): Promise<ReportIndex> {
  const raw = await blobGet(BLOB_INDEX)
  if (!raw) return { reports: [] }
  try { return JSON.parse(raw) } catch { return { reports: [] } }
}

async function blobLoadReport(date: string): Promise<Report | null> {
  const raw = await blobGet(blobReportPath(date))
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

async function blobSaveReport(report: Report): Promise<void> {
  await blobPut(blobReportPath(report.date), JSON.stringify(report, null, 2))
  const index = await blobLoadIndex()
  const existing = index.reports.findIndex((r) => r.date === report.date && r.reportType === report.reportType)
  const entry = { date: report.date, reportType: report.reportType, kpi: report.kpi }
  if (existing >= 0) index.reports[existing] = entry
  else index.reports.push(entry)
  index.reports.sort((a, b) => (a.date < b.date ? 1 : -1))
  await blobPut(BLOB_INDEX, JSON.stringify(index, null, 2))
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function saveReport(report: Report): Promise<void> {
  if (USE_BLOB) return blobSaveReport(report)
  fsBackend().saveReport(report)
}

export async function loadReport(date: string): Promise<Report | null> {
  if (USE_BLOB) return blobLoadReport(date)
  return fsBackend().loadReport(date)
}

export async function loadIndex(): Promise<ReportIndex> {
  if (USE_BLOB) return blobLoadIndex()
  return fsBackend().loadIndex()
}

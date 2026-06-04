import fs from 'fs'
import path from 'path'
import { Report, ReportIndex } from '@/types/report'

const DATA_DIR = path.join(process.cwd(), 'data', 'reports')
const INDEX_FILE = path.join(process.cwd(), 'data', 'index.json')

export function saveReport(report: Report): void {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(
    path.join(DATA_DIR, `${report.date}.json`),
    JSON.stringify(report, null, 2),
    'utf8'
  )
  updateIndex(report)
}

export function loadReport(date: string): Report | null {
  const filePath = path.join(DATA_DIR, `${date}.json`)
  if (!fs.existsSync(filePath)) return null
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw) as Report
  } catch {
    return null
  }
}

export function loadIndex(): ReportIndex {
  if (!fs.existsSync(INDEX_FILE)) {
    return { reports: [] }
  }
  try {
    const raw = fs.readFileSync(INDEX_FILE, 'utf8')
    return JSON.parse(raw) as ReportIndex
  } catch {
    return { reports: [] }
  }
}

function updateIndex(report: Report): void {
  const index = loadIndex()
  const existing = index.reports.findIndex((r) => r.date === report.date)
  const entry = { date: report.date, kpi: report.kpi }
  if (existing >= 0) {
    index.reports[existing] = entry
  } else {
    index.reports.push(entry)
  }
  // Sort descending
  index.reports.sort((a, b) => (a.date < b.date ? 1 : -1))
  fs.mkdirSync(path.dirname(INDEX_FILE), { recursive: true })
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf8')
}
